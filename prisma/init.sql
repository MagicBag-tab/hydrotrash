-- DDL for TrashRecord (SQLite)
-- Use this only if you cannot run Prisma migrations (e.g. npx prisma migrate deploy).
-- Create DB: sqlite3 prisma/dev.db < prisma/init.sql
-- Or from project root with DATABASE_URL=file:./dev.db: sqlite3 dev.db < prisma/init.sql

CREATE TABLE IF NOT EXISTS "TrashRecord" (
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
