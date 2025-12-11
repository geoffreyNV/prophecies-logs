-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "zoneId" INTEGER,
    "zoneName" TEXT,
    "owner" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "fightId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "kill" BOOLEAN NOT NULL,
    "difficulty" INTEGER,
    "fightPercentage" REAL,
    "lastPhase" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fight_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Death" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fightId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "DeathAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fightId" TEXT NOT NULL,
    "totalDeaths" INTEGER NOT NULL,
    "deathsBeforeWipe" INTEGER NOT NULL,
    "deathsAfterWipe" INTEGER NOT NULL,
    "estimatedWipeCallTime" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeathAnalysis_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "description" TEXT,
    "spellId" INTEGER,
    "iconUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "server" TEXT,
    "region" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_code_key" ON "Report"("code");

-- CreateIndex
CREATE INDEX "Report_code_idx" ON "Report"("code");

-- CreateIndex
CREATE INDEX "Report_startTime_idx" ON "Report"("startTime");

-- CreateIndex
CREATE INDEX "Fight_encounterId_idx" ON "Fight"("encounterId");

-- CreateIndex
CREATE INDEX "Fight_kill_idx" ON "Fight"("kill");

-- CreateIndex
CREATE UNIQUE INDEX "Fight_reportId_fightId_key" ON "Fight"("reportId", "fightId");

-- CreateIndex
CREATE INDEX "Death_fightId_idx" ON "Death"("fightId");

-- CreateIndex
CREATE INDEX "Death_playerName_idx" ON "Death"("playerName");

-- CreateIndex
CREATE INDEX "Death_killingAbility_idx" ON "Death"("killingAbility");

-- CreateIndex
CREATE UNIQUE INDEX "DeathAnalysis_fightId_key" ON "DeathAnalysis"("fightId");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_nameEn_key" ON "Spell"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_spellId_key" ON "Spell"("spellId");

-- CreateIndex
CREATE INDEX "Spell_nameEn_idx" ON "Spell"("nameEn");

-- CreateIndex
CREATE INDEX "Spell_spellId_idx" ON "Spell"("spellId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");
