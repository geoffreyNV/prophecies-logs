/*
  Warnings:

  - You are about to alter the column `timestamp` on the `Death` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `endTime` on the `Fight` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `startTime` on the `Fight` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `endTime` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `startTime` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Death" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fightId" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "killingAbility" TEXT NOT NULL,
    "killingAbilityId" INTEGER,
    "killingSource" TEXT,
    "fightTimeSeconds" REAL NOT NULL,
    "isAfterWipeCall" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Death_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Death" ("createdAt", "fightId", "fightTimeSeconds", "id", "isAfterWipeCall", "killingAbility", "killingAbilityId", "killingSource", "playerId", "playerName", "timestamp") SELECT "createdAt", "fightId", "fightTimeSeconds", "id", "isAfterWipeCall", "killingAbility", "killingAbilityId", "killingSource", "playerId", "playerName", "timestamp" FROM "Death";
DROP TABLE "Death";
ALTER TABLE "new_Death" RENAME TO "Death";
CREATE INDEX "Death_fightId_idx" ON "Death"("fightId");
CREATE INDEX "Death_playerName_idx" ON "Death"("playerName");
CREATE INDEX "Death_killingAbility_idx" ON "Death"("killingAbility");
CREATE TABLE "new_Fight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "fightId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "kill" BOOLEAN NOT NULL,
    "difficulty" INTEGER,
    "fightPercentage" REAL,
    "lastPhase" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fight_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Fight" ("createdAt", "difficulty", "encounterId", "endTime", "fightId", "fightPercentage", "id", "kill", "lastPhase", "name", "reportId", "startTime", "updatedAt") SELECT "createdAt", "difficulty", "encounterId", "endTime", "fightId", "fightPercentage", "id", "kill", "lastPhase", "name", "reportId", "startTime", "updatedAt" FROM "Fight";
DROP TABLE "Fight";
ALTER TABLE "new_Fight" RENAME TO "Fight";
CREATE INDEX "Fight_encounterId_idx" ON "Fight"("encounterId");
CREATE INDEX "Fight_kill_idx" ON "Fight"("kill");
CREATE UNIQUE INDEX "Fight_reportId_fightId_key" ON "Fight"("reportId", "fightId");
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "zoneId" INTEGER,
    "zoneName" TEXT,
    "owner" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Report" ("code", "createdAt", "endTime", "id", "owner", "startTime", "title", "updatedAt", "zoneId", "zoneName") SELECT "code", "createdAt", "endTime", "id", "owner", "startTime", "title", "updatedAt", "zoneId", "zoneName" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE UNIQUE INDEX "Report_code_key" ON "Report"("code");
CREATE INDEX "Report_code_idx" ON "Report"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
