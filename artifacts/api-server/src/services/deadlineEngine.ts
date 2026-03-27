/**
 * Intelligent Deadline Engine
 *
 * Suggests task durations and deadlines based on:
 * - Turbine model
 * - Section / stage position
 * - Task priority
 * - Historical completion data
 *
 * Rules:
 * - Stage 1 turbine work → HIGH CRITICAL → reduced time
 * - Combustion / mid-frame → medium-high
 * - Exhaust / exit-cylinder → lower priority
 * - Priority modifiers: HIGH → -30%, MEDIUM → base, LOW → +20%
 */

import { db } from "@workspace/db";
import { tasksTable, timeEntriesTable, assetSectionsTable, assetStagesTable, assetsTable } from "@workspace/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";

// ─── Base duration matrix (hours) ────────────────────────────────────────────
// Key: `${turbineModel}::${sectionSlug}`
const BASE_DURATION_HOURS: Record<string, number> = {
  // SGT-9000HL — more complex, longer base times
  "SGT-9000HL::compressor":    24,
  "SGT-9000HL::mid-frame":     32,   // combustion — medium-high
  "SGT-9000HL::turbine":       40,   // hot gas path — highest base
  "SGT-9000HL::exit-cylinder": 16,   // exhaust — lower

  // SGT-8000H — slightly shorter base times
  "SGT-8000H::compressor":    20,
  "SGT-8000H::mid-frame":     28,
  "SGT-8000H::turbine":       36,
  "SGT-8000H::exit-cylinder": 14,
};

// Stage multiplier: Stage 1 = critical, later stages = less critical
const STAGE_MULTIPLIER: Record<number, number> = {
  1: 0.70,   // Stage 1 → HIGH CRITICAL → reduce time (faster turnaround demanded)
  2: 0.85,
  3: 1.00,
  4: 1.10,
};

// Priority modifier
const PRIORITY_MODIFIER: Record<string, number> = {
  high:   0.70,  // -30% → tighter deadline
  medium: 1.00,  // base
  low:    1.20,  // +20% → more relaxed
};

// Section name → slug mapping (case-insensitive)
function sectionNameToSlug(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("compressor")) return "compressor";
  if (lower.includes("mid") || lower.includes("combusti")) return "mid-frame";
  if (lower.includes("turbine") && !lower.includes("exit")) return "turbine";
  if (lower.includes("exit") || lower.includes("exhaust") || lower.includes("diffuser")) return "exit-cylinder";
  return "turbine"; // default fallback
}

export interface DeadlineSuggestion {
  suggestedDurationHours: number;
  suggestedDeadline: string; // ISO-8601
  confidence: "historical" | "rule-based";
  basedOnSamples: number;
  breakdown: {
    baseDuration: number;
    stageMultiplier: number;
    priorityModifier: number;
    historicalAdjustment: number;
  };
}

export interface DeadlineInput {
  turbineModel?: string;
  sectionName?: string;
  stageNumber?: number;
  priority?: string;
  assetId?: number;
  sectionId?: number;
  stageId?: number;
}

/**
 * Fetch historical average completion time for similar tasks.
 * "Similar" = same asset model + same section.
 */
async function getHistoricalAverage(
  turbineModel: string | undefined,
  sectionName: string | undefined,
): Promise<{ avgHours: number; sampleCount: number } | null> {
  try {
    // Build conditions for historical lookup
    const conditions = [];

    if (turbineModel) {
      // Join tasks → assets to filter by model
      const result = await db
        .select({
          avgMinutes: sql<number>`coalesce(avg(${timeEntriesTable.duration}), 0)::numeric`,
          sampleCount: sql<number>`count(*)::int`,
        })
        .from(timeEntriesTable)
        .innerJoin(tasksTable, eq(timeEntriesTable.taskId, tasksTable.id))
        .innerJoin(assetsTable, eq(tasksTable.assetId, assetsTable.id))
        .leftJoin(assetSectionsTable, eq(tasksTable.sectionId, assetSectionsTable.id))
        .where(
          and(
            eq(assetsTable.model, turbineModel),
            isNotNull(timeEntriesTable.duration),
            ...(sectionName ? [eq(assetSectionsTable.name, sectionName)] : []),
          ),
        );

      const row = result[0];
      if (row && row.sampleCount > 0) {
        return {
          avgHours: Math.round((Number(row.avgMinutes) / 60) * 10) / 10,
          sampleCount: row.sampleCount,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve section/stage metadata from IDs if not provided directly.
 */
async function resolveMetadata(input: DeadlineInput): Promise<{
  turbineModel: string;
  sectionName: string;
  stageNumber: number;
}> {
  let turbineModel = input.turbineModel ?? "SGT-9000HL";
  let sectionName = input.sectionName ?? "Turbine";
  let stageNumber = input.stageNumber ?? 1;

  try {
    if (input.assetId && !input.turbineModel) {
      const [asset] = await db
        .select({ model: assetsTable.model })
        .from(assetsTable)
        .where(eq(assetsTable.id, input.assetId));
      if (asset) turbineModel = asset.model;
    }

    if (input.sectionId && !input.sectionName) {
      const [section] = await db
        .select({ name: assetSectionsTable.name })
        .from(assetSectionsTable)
        .where(eq(assetSectionsTable.id, input.sectionId));
      if (section) sectionName = section.name;
    }

    if (input.stageId && !input.stageNumber) {
      const [stage] = await db
        .select({ stageNumber: assetStagesTable.stageNumber })
        .from(assetStagesTable)
        .where(eq(assetStagesTable.id, input.stageId));
      if (stage) stageNumber = stage.stageNumber;
    }
  } catch {
    // Use defaults on any resolution failure
  }

  return { turbineModel, sectionName, stageNumber };
}

/**
 * Main entry point: compute a deadline suggestion.
 */
export async function suggestDeadline(input: DeadlineInput): Promise<DeadlineSuggestion> {
  const { turbineModel, sectionName, stageNumber } = await resolveMetadata(input);
  const priority = input.priority ?? "medium";
  const sectionSlug = sectionNameToSlug(sectionName);

  // 1. Look up base duration
  const key = `${turbineModel}::${sectionSlug}`;
  const baseDuration = BASE_DURATION_HOURS[key] ?? 24;

  // 2. Stage multiplier
  const stageMul = STAGE_MULTIPLIER[stageNumber] ?? 1.0;

  // 3. Priority modifier
  const priorityMod = PRIORITY_MODIFIER[priority] ?? 1.0;

  // 4. Historical adjustment
  const historical = await getHistoricalAverage(turbineModel, sectionName);
  let historicalAdjustment = 1.0;
  let confidence: "historical" | "rule-based" = "rule-based";
  let basedOnSamples = 0;

  if (historical && historical.sampleCount >= 3) {
    // Blend: 60% rule-based + 40% historical
    const ruleBased = baseDuration * stageMul * priorityMod;
    const blended = ruleBased * 0.6 + historical.avgHours * 0.4;
    historicalAdjustment = blended / (baseDuration * stageMul * priorityMod);
    confidence = "historical";
    basedOnSamples = historical.sampleCount;
  }

  // 5. Final calculation
  const suggestedDurationHours =
    Math.round(baseDuration * stageMul * priorityMod * historicalAdjustment * 10) / 10;

  // 6. Deadline = now + suggested duration (business hours, simplified as calendar hours)
  const deadline = new Date();
  deadline.setTime(deadline.getTime() + suggestedDurationHours * 60 * 60 * 1000);

  return {
    suggestedDurationHours,
    suggestedDeadline: deadline.toISOString(),
    confidence,
    basedOnSamples,
    breakdown: {
      baseDuration,
      stageMultiplier: stageMul,
      priorityModifier: priorityMod,
      historicalAdjustment: Math.round(historicalAdjustment * 100) / 100,
    },
  };
}
