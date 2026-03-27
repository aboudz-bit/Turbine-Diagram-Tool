/**
 * QR Code / Asset Scanning Service
 *
 * Generates QR code data for turbines and components.
 * QR codes encode a URL that redirects to:
 * - Asset view with open tasks
 * - Quick task creation for that asset
 *
 * Uses a simple text-based QR payload (URL).
 * Actual QR image rendering is done on the frontend.
 */

import { db } from "@workspace/db";
import {
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  tasksTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export interface QrAssetInfo {
  type: "asset" | "section" | "stage" | "component";
  id: number;
  name: string;
  model?: string;
  parentPath: string[]; // breadcrumb: ["SGT-9000HL Unit 1", "Turbine", "Stage 1"]
  openTaskCount: number;
  qrPayload: string; // URL-encoded payload for QR generation
}

/**
 * Look up an asset entity by QR ID and return its context.
 * QR ID format: `{type}:{id}` — e.g., "asset:1", "component:25"
 */
export async function resolveQrCode(qrId: string, baseUrl: string): Promise<QrAssetInfo | null> {
  const [type, idStr] = qrId.split(":");
  const id = parseInt(idStr, 10);
  if (!type || isNaN(id)) return null;

  try {
    switch (type) {
      case "asset": {
        const [asset] = await db
          .select()
          .from(assetsTable)
          .where(eq(assetsTable.id, id));
        if (!asset) return null;

        const [taskCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(
            and(
              eq(tasksTable.assetId, id),
              sql`${tasksTable.status} NOT IN ('approved', 'draft')`,
            ),
          );

        return {
          type: "asset",
          id: asset.id,
          name: asset.name,
          model: asset.model,
          parentPath: [],
          openTaskCount: taskCount?.count ?? 0,
          qrPayload: `${baseUrl}/tasks?assetId=${asset.id}`,
        };
      }

      case "section": {
        const [section] = await db
          .select({
            id: assetSectionsTable.id,
            name: assetSectionsTable.name,
            assetId: assetSectionsTable.assetId,
            assetName: assetsTable.name,
            assetModel: assetsTable.model,
          })
          .from(assetSectionsTable)
          .innerJoin(assetsTable, eq(assetSectionsTable.assetId, assetsTable.id))
          .where(eq(assetSectionsTable.id, id));
        if (!section) return null;

        const [taskCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(
            and(
              eq(tasksTable.sectionId, id),
              sql`${tasksTable.status} NOT IN ('approved', 'draft')`,
            ),
          );

        return {
          type: "section",
          id: section.id,
          name: section.name,
          model: section.assetModel,
          parentPath: [section.assetName],
          openTaskCount: taskCount?.count ?? 0,
          qrPayload: `${baseUrl}/tasks?sectionId=${section.id}`,
        };
      }

      case "stage": {
        const [stage] = await db
          .select({
            id: assetStagesTable.id,
            name: assetStagesTable.name,
            sectionId: assetStagesTable.sectionId,
            sectionName: assetSectionsTable.name,
            assetName: assetsTable.name,
            assetModel: assetsTable.model,
          })
          .from(assetStagesTable)
          .innerJoin(assetSectionsTable, eq(assetStagesTable.sectionId, assetSectionsTable.id))
          .innerJoin(assetsTable, eq(assetSectionsTable.assetId, assetsTable.id))
          .where(eq(assetStagesTable.id, id));
        if (!stage) return null;

        const [taskCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(
            and(
              eq(tasksTable.stageId, id),
              sql`${tasksTable.status} NOT IN ('approved', 'draft')`,
            ),
          );

        return {
          type: "stage",
          id: stage.id,
          name: stage.name,
          model: stage.assetModel,
          parentPath: [stage.assetName, stage.sectionName],
          openTaskCount: taskCount?.count ?? 0,
          qrPayload: `${baseUrl}/tasks?stageId=${stage.id}`,
        };
      }

      case "component": {
        const [comp] = await db
          .select({
            id: assetComponentsTable.id,
            name: assetComponentsTable.name,
            stageId: assetComponentsTable.stageId,
            stageName: assetStagesTable.name,
            sectionName: assetSectionsTable.name,
            assetName: assetsTable.name,
            assetModel: assetsTable.model,
          })
          .from(assetComponentsTable)
          .innerJoin(assetStagesTable, eq(assetComponentsTable.stageId, assetStagesTable.id))
          .innerJoin(assetSectionsTable, eq(assetStagesTable.sectionId, assetSectionsTable.id))
          .innerJoin(assetsTable, eq(assetSectionsTable.assetId, assetsTable.id))
          .where(eq(assetComponentsTable.id, id));
        if (!comp) return null;

        const [taskCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasksTable)
          .where(
            and(
              eq(tasksTable.componentId, id),
              sql`${tasksTable.status} NOT IN ('approved', 'draft')`,
            ),
          );

        return {
          type: "component",
          id: comp.id,
          name: comp.name,
          model: comp.assetModel,
          parentPath: [comp.assetName, comp.sectionName, comp.stageName],
          openTaskCount: taskCount?.count ?? 0,
          qrPayload: `${baseUrl}/tasks?componentId=${comp.id}`,
        };
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Generate QR code data for all assets and their sections.
 * Returns a list of QR payloads that can be rendered as QR images on the frontend.
 */
export async function generateQrManifest(baseUrl: string): Promise<QrAssetInfo[]> {
  const manifest: QrAssetInfo[] = [];

  try {
    const assets = await db.select().from(assetsTable);

    for (const asset of assets) {
      manifest.push({
        type: "asset",
        id: asset.id,
        name: asset.name,
        model: asset.model,
        parentPath: [],
        openTaskCount: 0,
        qrPayload: `${baseUrl}/tasks?assetId=${asset.id}`,
      });

      const sections = await db
        .select()
        .from(assetSectionsTable)
        .where(eq(assetSectionsTable.assetId, asset.id));

      for (const section of sections) {
        manifest.push({
          type: "section",
          id: section.id,
          name: section.name,
          model: asset.model,
          parentPath: [asset.name],
          openTaskCount: 0,
          qrPayload: `${baseUrl}/tasks?sectionId=${section.id}`,
        });

        const stages = await db
          .select()
          .from(assetStagesTable)
          .where(eq(assetStagesTable.sectionId, section.id));

        for (const stage of stages) {
          manifest.push({
            type: "stage",
            id: stage.id,
            name: stage.name,
            model: asset.model,
            parentPath: [asset.name, section.name],
            openTaskCount: 0,
            qrPayload: `${baseUrl}/tasks?stageId=${stage.id}`,
          });
        }
      }
    }
  } catch (err) {
    console.error("[qrService] Failed to generate manifest:", err);
  }

  return manifest;
}
