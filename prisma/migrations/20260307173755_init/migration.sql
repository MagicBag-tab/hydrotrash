-- CreateTable
CREATE TABLE "TrashRecord" (
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
    "description" TEXT,
    "suggestedCleanup" TEXT,
    "source" TEXT
);
