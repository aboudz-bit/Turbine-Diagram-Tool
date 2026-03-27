import { db } from "@workspace/db";
import {
  usersTable,
  assetsTable,
  assetSectionsTable,
  assetStagesTable,
  assetComponentsTable,
  tasksTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const existingAssets = await db.select().from(assetsTable).limit(1);
  if (existingAssets.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const [engineer1] = await db.insert(usersTable).values({
    name: "Ahmed Al-Rashidi",
    email: "ahmed.alrashidi@sgt.com",
    role: "engineer",
  }).returning();

  const [engineer2] = await db.insert(usersTable).values({
    name: "Sarah Mitchell",
    email: "sarah.mitchell@sgt.com",
    role: "supervisor",
  }).returning();

  const [tech1] = await db.insert(usersTable).values({
    name: "Khalid Hamdan",
    email: "khalid.hamdan@sgt.com",
    role: "technician",
  }).returning();

  const [tech2] = await db.insert(usersTable).values({
    name: "Omar Farouq",
    email: "omar.farouq@sgt.com",
    role: "technician",
  }).returning();

  const [tech3] = await db.insert(usersTable).values({
    name: "Priya Nair",
    email: "priya.nair@sgt.com",
    role: "technician",
  }).returning();

  const [asset] = await db.insert(assetsTable).values({
    name: "SGT-9000HL Unit 1",
    model: "SGT-9000HL",
  }).returning();

  const sectionDefs = [
    { name: "Compressor", description: "Enhanced 3D airfoils (3rd gen), Variable Guide Vanes, Combined Journal Thrust bearing", order: 1 },
    { name: "Mid Frame", description: "Rotor Air Cooler, 12/16 combustors", order: 2 },
    { name: "Turbine", description: "Cooled stage 4, free-standing rotating heat shields", order: 3 },
    { name: "Turbine Exit Cylinder", description: "Ambient cooled Turbine Exhaust Casing Struts", order: 4 },
  ];

  const sections = await db.insert(assetSectionsTable).values(
    sectionDefs.map(s => ({ ...s, assetId: asset.id }))
  ).returning();

  const turbineSection = sections.find(s => s.name === "Turbine")!;
  const compressorSection = sections.find(s => s.name === "Compressor")!;

  const turbineStages = [
    { name: "Stage 1", stageNumber: 1, bladeCountMin: 80, bladeCountMax: 100 },
    { name: "Stage 2", stageNumber: 2, bladeCountMin: 70, bladeCountMax: 90 },
    { name: "Stage 3", stageNumber: 3, bladeCountMin: 60, bladeCountMax: 80 },
    { name: "Stage 4", stageNumber: 4, bladeCountMin: 50, bladeCountMax: 70 },
  ];

  const stages = await db.insert(assetStagesTable).values(
    turbineStages.map(s => ({ ...s, sectionId: turbineSection.id }))
  ).returning();

  const compressorStage = await db.insert(assetStagesTable).values({
    name: "Compressor Assembly",
    stageNumber: 1,
    sectionId: compressorSection.id,
  }).returning();

  const componentNames = ["Rotor Blade", "Stator Vane", "Seal", "Casing", "Shaft"];

  for (const stage of stages) {
    await db.insert(assetComponentsTable).values(
      componentNames.map(name => ({ name, stageId: stage.id }))
    );
  }
  await db.insert(assetComponentsTable).values(
    componentNames.map(name => ({ name, stageId: compressorStage[0].id }))
  );

  const now = new Date();
  const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await db.insert(tasksTable).values([
    {
      title: "Inspect Stage 1 Rotor Blades",
      description: "Full visual and dimensional inspection of all Stage 1 rotor blades for erosion, cracking, and tip clearance.",
      assetId: asset.id,
      sectionId: turbineSection.id,
      stageId: stages[0].id,
      assignedToId: tech1.id,
      createdById: engineer1.id,
      estimatedHours: "8",
      deadline: in2days,
      priority: "high",
      status: "in_progress",
    },
    {
      title: "Replace Stage 2 Stator Vanes",
      description: "Scheduled replacement of worn Stage 2 stator vane set as per OEM maintenance schedule.",
      assetId: asset.id,
      sectionId: turbineSection.id,
      stageId: stages[1].id,
      assignedToId: tech2.id,
      createdById: engineer1.id,
      estimatedHours: "12",
      deadline: in5days,
      priority: "medium",
      status: "assigned",
    },
    {
      title: "Compressor Borescope Inspection",
      description: "Borescope inspection of compressor blades and vanes for FOD damage and deposits.",
      assetId: asset.id,
      sectionId: compressorSection.id,
      stageId: compressorStage[0].id,
      assignedToId: tech3.id,
      createdById: engineer2.id,
      estimatedHours: "6",
      deadline: yesterday,
      priority: "high",
      status: "overdue",
    },
    {
      title: "Combustor Liner Replacement",
      description: "Replace 4 combustor liners in Mid Frame section showing thermal fatigue cracks.",
      assetId: asset.id,
      sectionId: sections.find(s => s.name === "Mid Frame")!.id,
      assignedToId: tech1.id,
      createdById: engineer2.id,
      estimatedHours: "16",
      deadline: in5days,
      priority: "high",
      status: "submitted",
    },
    {
      title: "Stage 3 Seal Gap Measurement",
      description: "Precision measurement of seal gaps in Stage 3 to verify within tolerance after last overhaul.",
      assetId: asset.id,
      sectionId: turbineSection.id,
      stageId: stages[2].id,
      assignedToId: tech2.id,
      createdById: engineer1.id,
      estimatedHours: "4",
      deadline: in5days,
      priority: "low",
      status: "approved",
    },
  ]);

  // ---------- SGT-8000H ----------
  const [asset8000] = await db.insert(assetsTable).values({
    name: "SGT-8000H Unit 1",
    model: "SGT-8000H",
  }).returning();

  const sectionDefs8000 = [
    { name: "Compressor", description: "15-stage axial compressor, Variable Inlet Guide Vanes, pressure ratio 19:1", order: 1 },
    { name: "Combustion Chamber", description: "Can-annular combustors, DLE burners, low NOx emissions", order: 2 },
    { name: "Turbine", description: "4-stage turbine, TBC-coated blades, closed-loop cooling", order: 3 },
    { name: "Exhaust", description: "Annular exhaust diffuser, axial exhaust flow", order: 4 },
  ];

  const sections8000 = await db.insert(assetSectionsTable).values(
    sectionDefs8000.map(s => ({ ...s, assetId: asset8000.id }))
  ).returning();

  const turbineSection8000 = sections8000.find(s => s.name === "Turbine")!;
  const compressorSection8000 = sections8000.find(s => s.name === "Compressor")!;

  const turbineStages8000 = [
    { name: "Stage 1", stageNumber: 1, bladeCountMin: 92, bladeCountMax: 96 },
    { name: "Stage 2", stageNumber: 2, bladeCountMin: 80, bladeCountMax: 84 },
    { name: "Stage 3", stageNumber: 3, bladeCountMin: 68, bladeCountMax: 72 },
    { name: "Stage 4", stageNumber: 4, bladeCountMin: 56, bladeCountMax: 60 },
  ];

  const stages8000 = await db.insert(assetStagesTable).values(
    turbineStages8000.map(s => ({ ...s, sectionId: turbineSection8000.id }))
  ).returning();

  const compressorStage8000 = await db.insert(assetStagesTable).values({
    name: "Compressor Assembly",
    stageNumber: 1,
    sectionId: compressorSection8000.id,
  }).returning();

  const componentNames8000 = ["Rotor Blade", "Stator Vane", "Seal", "Casing", "Shaft"];
  for (const stage of stages8000) {
    await db.insert(assetComponentsTable).values(
      componentNames8000.map(name => ({ name, stageId: stage.id }))
    );
  }
  await db.insert(assetComponentsTable).values(
    componentNames8000.map(name => ({ name, stageId: compressorStage8000[0].id }))
  );

  console.log("Database seeded successfully.");
}

seed().catch(console.error).finally(() => process.exit(0));
