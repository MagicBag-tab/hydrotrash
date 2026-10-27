-- CreateTable
CREATE TABLE "ObservationPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "weapElementCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pointId" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoUrl" TEXT,
    "notes" TEXT,
    "provenance" TEXT NOT NULL,
    CONSTRAINT "Observation_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "ObservationPoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisualAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "isEvaluable" BOOLEAN NOT NULL,
    "visibleAccumulation" BOOLEAN,
    "visibleObstruction" BOOLEAN,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisualAnalysis_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HumanReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "correctionsJson" TEXT,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HumanReview_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeapRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario" TEXT NOT NULL,
    "modelVersion" TEXT,
    "originalFileName" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WeapResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "elementCode" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "variable" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "WeapResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WeapRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrashRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "glassPercentage" REAL NOT NULL DEFAULT 0,
    "plasticPercentage" REAL NOT NULL DEFAULT 0,
    "paperPercentage" REAL NOT NULL DEFAULT 0,
    "organicPercentage" REAL NOT NULL DEFAULT 0,
    "metalPercentage" REAL NOT NULL DEFAULT 0,
    "otherPercentage" REAL NOT NULL DEFAULT 0,
    "eWastePercentage" REAL NOT NULL DEFAULT 0,
    "hazardousPercentage" REAL NOT NULL DEFAULT 0,
    "specialTreatmentPercentage" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "suggestedCleanup" TEXT,
    "imageUrl" TEXT,
    "source" TEXT,
    "siteType" TEXT,
    "outfallCode" TEXT,
    "flowObserved" TEXT,
    "notes" TEXT,
    "observationId" TEXT,
    CONSTRAINT "TrashRecord_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrashRecord" ("createdAt", "description", "eWastePercentage", "flowObserved", "glassPercentage", "hazardousPercentage", "id", "imageUrl", "latitude", "longitude", "metalPercentage", "notes", "organicPercentage", "otherPercentage", "outfallCode", "paperPercentage", "plasticPercentage", "siteType", "source", "specialTreatmentPercentage", "suggestedCleanup") SELECT "createdAt", "description", "eWastePercentage", "flowObserved", "glassPercentage", "hazardousPercentage", "id", "imageUrl", "latitude", "longitude", "metalPercentage", "notes", "organicPercentage", "otherPercentage", "outfallCode", "paperPercentage", "plasticPercentage", "siteType", "source", "specialTreatmentPercentage", "suggestedCleanup" FROM "TrashRecord";
DROP TABLE "TrashRecord";
ALTER TABLE "new_TrashRecord" RENAME TO "TrashRecord";
CREATE UNIQUE INDEX "TrashRecord_observationId_key" ON "TrashRecord"("observationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ObservationPoint_code_key" ON "ObservationPoint"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VisualAnalysis_observationId_key" ON "VisualAnalysis"("observationId");

-- CreateIndex
CREATE UNIQUE INDEX "HumanReview_observationId_key" ON "HumanReview"("observationId");

-- CreateIndex
CREATE INDEX "WeapResult_elementCode_variable_unit_periodStart_periodEnd_idx" ON "WeapResult"("elementCode", "variable", "unit", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WeapResult_runId_elementCode_periodStart_periodEnd_variable_unit_key" ON "WeapResult"("runId", "elementCode", "periodStart", "periodEnd", "variable", "unit");
