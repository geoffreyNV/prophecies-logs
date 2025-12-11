import { prisma } from './db';
import { getReport, getFightDeaths, getFightSummary } from './warcraftlogs';
import { analyzeFightDeaths, detectWipeCall } from './analysis';
import { Death } from '@/types';

const WIPE_DEATH_THRESHOLD = 5;
const WIPE_TIME_WINDOW = 10;

// Durée de cache en millisecondes (1 heure par défaut)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Récupère ou met en cache un rapport depuis WarcraftLogs
 */
export async function getCachedReport(reportCode: string) {
  // Vérifier si le rapport existe en cache
  const cached = await prisma.report.findUnique({
    where: { code: reportCode },
    include: {
      fights: {
        orderBy: { startTime: 'asc' },
      },
    },
  });

  // Si le cache est récent (moins de 1h) ET qu'il a des fights, retourner le cache
  if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_DURATION && cached.fights.length > 0) {
    console.log(`[Cache] Rapport ${reportCode} trouvé en cache avec ${cached.fights.length} fights`);
    return cached;
  }

  // Si le rapport existe mais n'a pas de fights, forcer la réimportation
  if (cached && cached.fights.length === 0) {
    console.log(`[Cache] Rapport ${reportCode} trouvé mais sans fights, réimportation forcée`);
  }

  // Sinon, récupérer depuis l'API
  console.log(`[API] Récupération du rapport ${reportCode} depuis WarcraftLogs`);
  const reportData = await getReport(reportCode);

  if (!reportData || typeof reportData !== 'object') {
    throw new Error('Invalid report data');
  }

  const report = reportData as {
    code: string;
    title: string;
    startTime: number;
    endTime: number;
    zone?: { id: number; name: string };
    owner?: { name: string };
    fights: Array<{
      id: number;
      name: string;
      encounterID: number;
      startTime: number;
      endTime: number;
      kill: boolean;
      difficulty?: number;
      fightPercentage?: number;
      lastPhase?: number;
    }>;
  };

  // Sauvegarder ou mettre à jour en base
  // Note: Le titre sera récupéré depuis l'API lors de l'import complet
  // Convertir les timestamps en BigInt
  const savedReport = await prisma.report.upsert({
    where: { code: reportCode },
    update: {
      title: report.title || `Rapport ${reportCode}`,
      startTime: BigInt(report.startTime),
      endTime: BigInt(report.endTime),
      zoneId: report.zone?.id,
      zoneName: report.zone?.name,
      owner: report.owner?.name,
      updatedAt: new Date(),
    },
    create: {
      code: report.code,
      title: report.title || `Rapport ${reportCode}`,
      startTime: BigInt(report.startTime),
      endTime: BigInt(report.endTime),
      zoneId: report.zone?.id,
      zoneName: report.zone?.name,
      owner: report.owner?.name,
    },
  });

  // Sauvegarder les fights
  for (const fight of report.fights) {
    await prisma.fight.upsert({
      where: {
        reportId_fightId: {
          reportId: savedReport.id,
          fightId: fight.id,
        },
      },
      update: {
        name: fight.name,
        encounterId: fight.encounterID,
        startTime: BigInt(fight.startTime),
        endTime: BigInt(fight.endTime),
        kill: fight.kill,
        difficulty: fight.difficulty,
        fightPercentage: fight.fightPercentage,
        lastPhase: fight.lastPhase,
        updatedAt: new Date(),
      },
      create: {
        reportId: savedReport.id,
        fightId: fight.id,
        name: fight.name,
        encounterId: fight.encounterID,
        startTime: BigInt(fight.startTime),
        endTime: BigInt(fight.endTime),
        kill: fight.kill,
        difficulty: fight.difficulty,
        fightPercentage: fight.fightPercentage,
        lastPhase: fight.lastPhase,
      },
    });
  }

  // Récupérer les fights depuis la DB pour retourner
  const fights = await prisma.fight.findMany({
    where: { reportId: savedReport.id },
    orderBy: { startTime: 'asc' },
  });

  return {
    ...savedReport,
    fights,
  };
}

/**
 * Récupère ou met en cache l'analyse des morts d'un combat
 */
export async function getCachedDeathAnalysis(reportCode: string, fightId: number) {
  // Trouver le fight en DB
  const report = await prisma.report.findUnique({
    where: { code: reportCode },
    include: {
      fights: {
        where: { fightId },
      },
    },
  });

  if (!report || report.fights.length === 0) {
    throw new Error(`Fight ${fightId} not found in report ${reportCode}`);
  }

  const fight = report.fights[0];

  // Vérifier si les morts existent déjà en BDD (même si le cache est expiré)
  const deathsInDb = await prisma.death.findMany({
    where: { fightId: fight.id },
    orderBy: { fightTimeSeconds: 'asc' },
  });

  // Si les morts sont en BDD, utiliser directement sans appel API
  if (deathsInDb.length > 0) {
    console.log(`[BDD] Utilisation des ${deathsInDb.length} morts depuis la BDD pour le fight ${fightId}`);
    
    // Récupérer ou recalculer l'analyse
    const cachedAnalysis = await prisma.deathAnalysis.findUnique({
      where: { fightId: fight.id },
    });

    // Convertir les morts de la BDD au format attendu
    const deaths = deathsInDb.map(d => ({
      timestamp: Number(d.timestamp),
      playerName: d.playerName,
      playerId: d.playerId,
      killingAbility: d.killingAbility,
      killingAbilityId: d.killingAbilityId ?? undefined,
      killingSource: d.killingSource ?? undefined,
      fightTimeSeconds: d.fightTimeSeconds,
      isAfterWipeCall: d.isAfterWipeCall,
    }));

    // Si l'analyse existe, l'utiliser, sinon la recalculer depuis les morts
    if (cachedAnalysis) {
      return {
        fightId: fight.fightId,
        fightName: fight.name,
        totalDeaths: cachedAnalysis.totalDeaths,
        deathsBeforeWipe: cachedAnalysis.deathsBeforeWipe,
        deathsAfterWipe: cachedAnalysis.deathsAfterWipe,
        estimatedWipeCallTime: cachedAnalysis.estimatedWipeCallTime ?? undefined,
        deaths,
      };
    } else {
      // Recalculer l'analyse depuis les morts en BDD
      const fightDuration = (Number(fight.endTime) - Number(fight.startTime)) / 1000;
      const wipeCallTime = detectWipeCall(deaths, fightDuration);
      const deathsBeforeWipe = wipeCallTime ? deaths.filter(d => d.fightTimeSeconds < wipeCallTime).length : deaths.length;
      const deathsAfterWipe = wipeCallTime ? deaths.filter(d => d.fightTimeSeconds >= wipeCallTime).length : 0;

      // Sauvegarder l'analyse recalculée
      const newAnalysis = await prisma.deathAnalysis.upsert({
        where: { fightId: fight.id },
        update: {
          totalDeaths: deaths.length,
          deathsBeforeWipe,
          deathsAfterWipe,
          estimatedWipeCallTime: wipeCallTime,
          updatedAt: new Date(),
        },
        create: {
          fightId: fight.id,
          totalDeaths: deaths.length,
          deathsBeforeWipe,
          deathsAfterWipe,
          estimatedWipeCallTime: wipeCallTime,
        },
      });

      return {
        fightId: fight.fightId,
        fightName: fight.name,
        totalDeaths: newAnalysis.totalDeaths,
        deathsBeforeWipe: newAnalysis.deathsBeforeWipe,
        deathsAfterWipe: newAnalysis.deathsAfterWipe,
        estimatedWipeCallTime: newAnalysis.estimatedWipeCallTime ?? undefined,
        deaths,
      };
    }
  }

  // Si les morts ne sont pas en BDD, faire un appel API
  console.log(`[API] Analyse du fight ${fightId} depuis WarcraftLogs (données non disponibles en BDD)`);
  const analysis = await analyzeFightDeaths(reportCode, fightId);

  // Sauvegarder l'analyse
  await prisma.deathAnalysis.upsert({
    where: { fightId: fight.id },
    update: {
      totalDeaths: analysis.totalDeaths,
      deathsBeforeWipe: analysis.deathsBeforeWipe,
      deathsAfterWipe: analysis.deathsAfterWipe,
      estimatedWipeCallTime: analysis.estimatedWipeCallTime,
      updatedAt: new Date(),
    },
    create: {
      fightId: fight.id,
      totalDeaths: analysis.totalDeaths,
      deathsBeforeWipe: analysis.deathsBeforeWipe,
      deathsAfterWipe: analysis.deathsAfterWipe,
      estimatedWipeCallTime: analysis.estimatedWipeCallTime,
    },
  });

  // Sauvegarder les morts
  await prisma.death.deleteMany({
    where: { fightId: fight.id },
  });

  await prisma.death.createMany({
    data: analysis.deaths.map(d => ({
      fightId: fight.id,
      timestamp: BigInt(d.timestamp),
      playerName: d.playerName,
      playerId: d.playerId,
      killingAbility: d.killingAbility || 'Dégâts divers',
      killingAbilityId: d.killingAbilityId ?? null,
      killingSource: d.killingSource ?? null,
      fightTimeSeconds: d.fightTimeSeconds,
      isAfterWipeCall: d.isAfterWipeCall,
    })),
  });

  return analysis;
}

/**
 * Met en cache une traduction de sort
 */
export async function cacheSpellTranslation(nameEn: string, nameFr: string, description?: string, spellId?: number) {
  await prisma.spell.upsert({
    where: { nameEn },
    update: {
      nameFr,
      description,
      spellId,
      updatedAt: new Date(),
    },
    create: {
      nameEn,
      nameFr,
      description,
      spellId,
    },
  });
}

/**
 * Récupère une traduction de sort depuis le cache
 */
export async function getCachedSpellTranslation(nameEn: string) {
  const spell = await prisma.spell.findUnique({
    where: { nameEn },
  });

  return spell;
}

