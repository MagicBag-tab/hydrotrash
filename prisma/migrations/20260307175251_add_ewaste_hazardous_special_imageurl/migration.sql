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
    "source" TEXT
);
INSERT INTO "new_TrashRecord" ("createdAt", "description", "glassPercentage", "id", "latitude", "longitude", "metalPercentage", "organicPercentage", "otherPercentage", "paperPercentage", "plasticPercentage", "source", "suggestedCleanup") SELECT "createdAt", "description", "glassPercentage", "id", "latitude", "longitude", "metalPercentage", "organicPercentage", "otherPercentage", "paperPercentage", "plasticPercentage", "source", "suggestedCleanup" FROM "TrashRecord";
DROP TABLE "TrashRecord";
ALTER TABLE "new_TrashRecord" RENAME TO "TrashRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
