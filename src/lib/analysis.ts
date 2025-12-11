import { Death, DeathAnalysis, FightComparison, BossComparison } from '@/types';
import { getReport, getFightDeaths, getFightSummary } from './warcraftlogs';
import { getCachedReport, getCachedDeathAnalysis } from './report-cache';

const WIPE_DEATH_THRESHOLD = 5;
const WIPE_TIME_WINDOW = 10;

interface FightInfo {
  id: number;
  name: string;
  encounterID: number;
  startTime: number;
  endTime: number;
  kill: boolean;
  difficulty?: number;
  fightPercentage?: number;
}

interface Actor {
  id: number;
  name: string;
  type: string;
  subType?: string;
}

interface Ability {
  gameID: number;
  name: string;
}

interface DeathEvent {
  timestamp: number;
  type: string;
  targetID: number;
  targetInstance?: number;
  killerID?: number;
  killingAbilityGameID?: number;
  ability?: {
    name: string;
    guid: number;
  };
}

export function detectWipeCall(deaths: Death[], fightDuration: number): number | undefined {
  if (deaths.length < WIPE_DEATH_THRESHOLD) {
    return undefined;
  }

  for (let i = 0; i <= deaths.length - WIPE_DEATH_THRESHOLD; i++) {
    const windowStart = deaths[i].fightTimeSeconds;
    const windowEnd = deaths[i + WIPE_DEATH_THRESHOLD - 1].fightTimeSeconds;

    if (windowEnd - windowStart <= WIPE_TIME_WINDOW) {
      if (windowStart > fightDuration * 0.5) {
        return windowStart;
      }
    }
  }

  return undefined;
}

export async function analyzeFightDeaths(
  reportCode: string,
  fightId: number
): Promise<DeathAnalysis> {
  const [fightData, deathData] = await Promise.all([
    getFightSummary(reportCode, fightId),
    getFightDeaths(reportCode, fightId),
  ]);

  const fightDataTyped = fightData as { fights: FightInfo[] } | null;
  
  if (!fightDataTyped || !fightDataTyped.fights || fightDataTyped.fights.length === 0) {
    throw new Error(`Fight ${fightId} not found in report ${reportCode}`);
  }

  const fightInfo = fightDataTyped.fights[0];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deathDataTyped = deathData as any;
  
  const fightStart = deathDataTyped?.fights?.[0]?.startTime || fightInfo.startTime;
  const fightEnd = deathDataTyped?.fights?.[0]?.endTime || fightInfo.endTime;
  const fightDuration = (fightEnd - fightStart) / 1000;

  const actorsMap: Record<number, Actor> = {};
  const abilitiesMap: Record<number, Ability> = {};
  
  const masterData = deathDataTyped?.masterData;
  if (masterData?.actors) {
    for (const actor of masterData.actors) {
      actorsMap[actor.id] = actor;
    }
  }
  if (masterData?.abilities) {
    for (const ability of masterData.abilities) {
      abilitiesMap[ability.gameID] = ability;
    }
  }

  const deaths: Death[] = [];
  const eventsData: DeathEvent[] = deathDataTyped?.events?.data || [];
  
  console.log(`Fight ${fightId}: Found ${eventsData.length} death events`);

  for (const event of eventsData) {
    if (event.type !== 'death') continue;
    
    const targetId = event.targetID;
    const actor = actorsMap[targetId];
    
    if (!actor || actor.type !== 'Player') continue;
    
    const timestamp = event.timestamp;
    const fightTime = (timestamp - fightStart) / 1000;
    
    let killingAbility = 'Dégâts divers';
    let killingSource = '';
    
    if (event.ability?.name) {
      killingAbility = event.ability.name;
    } else if (event.killingAbilityGameID && abilitiesMap[event.killingAbilityGameID]) {
      killingAbility = abilitiesMap[event.killingAbilityGameID].name;
    }
    
    if (event.killerID && actorsMap[event.killerID]) {
      killingSource = actorsMap[event.killerID].name;
    }
    
    deaths.push({
      timestamp,
      playerName: actor.name,
      playerId: targetId,
      killingAbility,
      killingAbilityId: event.killingAbilityGameID || event.ability?.guid,
      killingSource,
      fightTimeSeconds: fightTime,
      isAfterWipeCall: false,
    });
  }

  deaths.sort((a, b) => a.fightTimeSeconds - b.fightTimeSeconds);

  console.log(`Fight ${fightId}: ${deaths.length} player deaths after filtering`);

  const wipeCallTime = detectWipeCall(deaths, fightDuration);

  let deathsBeforeWipe = 0;
  let deathsAfterWipe = 0;

  for (const death of deaths) {
    if (wipeCallTime !== undefined && death.fightTimeSeconds > wipeCallTime) {
      death.isAfterWipeCall = true;
      deathsAfterWipe++;
    } else {
      deathsBeforeWipe++;
    }
  }

  return {
    fightId,
    fightName: fightInfo.name,
    totalDeaths: deaths.length,
    deathsBeforeWipe,
    deathsAfterWipe,
    estimatedWipeCallTime: wipeCallTime,
    deaths,
  };
}

export interface PlayerFailStats {
  playerName: string;
  totalDeaths: number;
  deathsByAbility: Record<string, number>;
  averageDeathTime: number;
  firstDeathCount: number;
}

export interface AbilityFailStats {
  abilityName: string;
  totalKills: number;
  playerVictims: Record<string, number>;
  averageKillTime: number;
}

export interface CriticalDeath {
  player: string;
  ability: string;
  source: string;
  time: number;
  deathNumber: number;
}

export interface NightCriticalDeaths {
  date: string;
  reportCode: string;
  attempts: {
    attemptNumber: number;
    fightPercentage?: number;
    kill: boolean;
    criticalDeaths: CriticalDeath[];
  }[];
}

// Nouveau: Stats de survie par joueur
export interface PlayerSurvivalStats {
  playerName: string;
  totalFightsPresent: number;
  totalDeaths: number;
  deathsBeforeWipeCall: number; // Morts avant le wipe call
  deathsAfterWipeCall: number; // Morts après le wipe call
  fightsSurvivedFull: number; // Fights où il n'est pas mort
  averageSurvivalTime: number; // Temps moyen avant de mourir (toutes morts confondues)
  averageSurvivalTimeBeforeWipe: number; // Temps moyen avant de mourir AVANT le wipe call
  averageSurvivalTimeAfterWipe: number; // Temps moyen avant de mourir APRÈS le wipe call
  survivalTimes: number[]; // Tous les temps de survie pour calculer la médiane
  survivalTimesBeforeWipe: number[]; // Temps de survie avant wipe call
  survivalTimesAfterWipe: number[]; // Temps de survie après wipe call
  survivalRate: number; // % de fights où il a survécu jusqu'au bout
}

export interface FailAnalysis {
  playerRanking: PlayerFailStats[];
  abilityRanking: AbilityFailStats[];
  deadlyCombos: { player: string; ability: string; count: number }[];
  deathsByPhase: { phase: string; count: number; players: string[] }[];
  firstDeaths: { player: string; ability: string; time: number; attempt: number; date: string }[];
  criticalDeathsByNight: NightCriticalDeaths[];
  survivalStats: PlayerSurvivalStats[]; // Nouveau
  globalAverageSurvival: number; // Moyenne globale de survie
}

export async function compareBossAcrossReports(
  reportCodes: string[],
  bossName: string,
  difficulty?: number
): Promise<BossComparison & { failAnalysis: FailAnalysis }> {
  const comparisons: FightComparison[] = [];
  const allDeaths: Death[] = [];
  const abilityDeathCount: Record<string, number> = {};
  
  const playerDeaths: Record<string, { deaths: Death[]; firstDeathCount: number }> = {};
  const abilityStats: Record<string, { kills: Death[] }> = {};
  const firstDeaths: { player: string; ability: string; time: number; attempt: number; date: string }[] = [];
  
  const criticalDeathsByNight: NightCriticalDeaths[] = [];
  
  // Pour les stats de survie
  const playerSurvivalData: Record<string, {
    fightDurations: number[];
    deathTimes: number[];
    deathTimesBeforeWipe: number[];
    deathTimesAfterWipe: number[];
    fightsSurvived: number;
  }> = {};

  for (const reportCode of reportCodes) {
    console.log(`Processing report: ${reportCode}`);
    
    // Essayer d'abord de récupérer depuis la BDD
    let report: {
      startTime: number | bigint;
      fights: Array<{
        id: number;
        fightId: number;
        name: string;
        encounterID?: number;
        encounterId?: number;
        startTime: number | bigint;
        endTime: number | bigint;
        kill: boolean;
        difficulty?: number;
        fightPercentage?: number;
        lastPhase?: number;
      }>;
    } | null = null;
    
    try {
      // Essayer de récupérer depuis la BDD
      const cachedReport = await getCachedReport(reportCode);
      if (cachedReport && cachedReport.fights && cachedReport.fights.length > 0) {
        console.log(`[BDD] Utilisation des données de la BDD pour ${reportCode}`);
        report = {
          startTime: Number(cachedReport.startTime),
          fights: cachedReport.fights.map(f => ({
            id: f.fightId, // Utiliser fightId de la BDD comme id
            fightId: f.fightId,
            name: f.name,
            encounterID: f.encounterId,
            encounterId: f.encounterId,
            startTime: Number(f.startTime),
            endTime: Number(f.endTime),
            kill: f.kill,
            difficulty: f.difficulty ?? undefined,
            fightPercentage: f.fightPercentage ?? undefined,
            lastPhase: f.lastPhase ?? undefined,
          })),
        };
      }
    } catch (error) {
      console.log(`[BDD] Rapport ${reportCode} non trouvé en BDD, utilisation de l'API`);
    }
    
    // Si pas en BDD, utiliser l'API
    if (!report) {
      const apiReport = await getReport(reportCode) as {
        startTime: number;
        fights: FightInfo[];
      } | null;
      
      if (!apiReport) {
        console.log(`Report ${reportCode} not found`);
        continue;
      }

      report = {
        startTime: apiReport.startTime,
        fights: apiReport.fights.map(f => ({
          id: f.id,
          fightId: f.id, // Utiliser id comme fightId pour l'API
          name: f.name,
          encounterID: f.encounterID,
          encounterId: f.encounterID,
          startTime: f.startTime,
          endTime: f.endTime,
          kill: f.kill,
          difficulty: f.difficulty,
          fightPercentage: f.fightPercentage,
          lastPhase: undefined,
        })),
      };
    }
    
    const reportDate = new Date(Number(report.startTime)).toISOString().split('T')[0];
    
    const nightData: NightCriticalDeaths = {
      date: reportDate,
      reportCode,
      attempts: [],
    };

    const matchingFights = (report.fights || []).filter(
      (f) =>
        f.name.toLowerCase().includes(bossName.toLowerCase()) &&
        (difficulty === undefined || f.difficulty === difficulty)
    );

    console.log(`Report ${reportCode}: Found ${matchingFights.length} fights for "${bossName}"`);

    let attemptNumber = 0;
    for (const fight of matchingFights) {
      attemptNumber++;
      const fightId = fight.id || fight.fightId;

      try {
        // Utiliser getCachedDeathAnalysis qui utilise la BDD si disponible
        const deathAnalysis = await getCachedDeathAnalysis(reportCode, fightId);
        const duration = (Number(fight.endTime) - Number(fight.startTime)) / 1000;

        comparisons.push({
          reportCode,
          reportDate,
          fightId,
          attemptNumber,
          durationSeconds: duration,
          kill: fight.kill,
          fightPercentage: fight.fightPercentage,
          deathAnalysis,
        });

        const relevantDeaths = deathAnalysis.deaths.filter(d => !d.isAfterWipeCall);
        
        // Tracker les joueurs présents dans ce fight
        const playersWhoDeadThisFight = new Set<string>();
        
        // Morts critiques
        const criticalDeaths: CriticalDeath[] = relevantDeaths.slice(0, 3).map((d, idx) => ({
          player: d.playerName,
          ability: d.killingAbility || 'Dégâts divers',
          source: d.killingSource || '',
          time: d.fightTimeSeconds,
          deathNumber: idx + 1,
        }));
        
        nightData.attempts.push({
          attemptNumber,
          fightPercentage: fight.fightPercentage,
          kill: fight.kill,
          criticalDeaths,
        });
        
        // Premier mort
        if (!fight.kill && relevantDeaths.length > 0) {
          const firstDeath = relevantDeaths[0];
          firstDeaths.push({
            player: firstDeath.playerName,
            ability: firstDeath.killingAbility || 'Dégâts divers',
            time: firstDeath.fightTimeSeconds,
            attempt: attemptNumber,
            date: reportDate
          });
          
          if (!playerDeaths[firstDeath.playerName]) {
            playerDeaths[firstDeath.playerName] = { deaths: [], firstDeathCount: 0 };
          }
          playerDeaths[firstDeath.playerName].firstDeathCount++;
        }

        for (const death of relevantDeaths) {
          allDeaths.push(death);
          playersWhoDeadThisFight.add(death.playerName);
          
          if (!playerDeaths[death.playerName]) {
            playerDeaths[death.playerName] = { deaths: [], firstDeathCount: 0 };
          }
          playerDeaths[death.playerName].deaths.push(death);
          
          const abilityName = death.killingAbility || 'Dégâts divers';
          if (!abilityStats[abilityName]) {
            abilityStats[abilityName] = { kills: [] };
          }
          abilityStats[abilityName].kills.push(death);
          
          abilityDeathCount[abilityName] = (abilityDeathCount[abilityName] || 0) + 1;
        }
        
        // Stats de survie : traiter TOUS les joueurs qui sont morts dans ce fight
        // Séparer les morts avant et après le wipe call
        const wipeCallTime = deathAnalysis.estimatedWipeCallTime;
        
        for (const death of deathAnalysis.deaths) {
          if (!playerSurvivalData[death.playerName]) {
            playerSurvivalData[death.playerName] = {
              fightDurations: [],
              deathTimes: [],
              deathTimesBeforeWipe: [],
              deathTimesAfterWipe: [],
              fightsSurvived: 0,
            };
          }
          
          // Temps de survie = temps avant de mourir
          playerSurvivalData[death.playerName].deathTimes.push(death.fightTimeSeconds);
          playerSurvivalData[death.playerName].fightDurations.push(duration);
          
          // Séparer selon si c'est avant ou après le wipe call
          if (death.isAfterWipeCall || (wipeCallTime !== undefined && death.fightTimeSeconds > wipeCallTime)) {
            // Mort après le wipe call
            playerSurvivalData[death.playerName].deathTimesAfterWipe.push(death.fightTimeSeconds);
          } else {
            // Mort avant le wipe call (ou pas de wipe call détecté)
            playerSurvivalData[death.playerName].deathTimesBeforeWipe.push(death.fightTimeSeconds);
          }
        }
        
        // Pour les joueurs qui ont survécu ce fight sans mourir du tout
        // On ne peut les compter que si on a la liste complète des joueurs présents
        // Pour l'instant, on ne compte que ceux qu'on sait avoir été présents (via les morts)
        // Note: On ne peut pas détecter les joueurs qui ont survécu sans mourir car on n'a pas
        // la liste complète des joueurs présents dans le fight
        
      } catch (error) {
        console.error(`Error analyzing fight ${fightId}:`, error);
      }
    }
    
    if (nightData.attempts.length > 0) {
      criticalDeathsByNight.push(nightData);
    }
  }

  console.log(`Analysis complete: ${allDeaths.length} total deaths, ${Object.keys(playerDeaths).length} players`);

  const totalAttempts = comparisons.length;
  const totalKills = comparisons.filter((c) => c.kill).length;
  const totalWipes = totalAttempts - totalKills;

  const wipeFights = comparisons.filter((c) => !c.kill);
  const averageDeathsBeforeWipe =
    wipeFights.length > 0
      ? wipeFights.reduce((sum, c) => sum + c.deathAnalysis.deathsBeforeWipe, 0) /
        wipeFights.length
      : 0;

  const mostDeadlyAbilities = Object.entries(abilityDeathCount)
    .map(([ability, deathCount]) => ({ ability, deathCount }))
    .sort((a, b) => b.deathCount - a.deathCount)
    .slice(0, 10);

  // Classement joueurs
  const playerRanking: PlayerFailStats[] = Object.entries(playerDeaths)
    .map(([playerName, data]) => {
      const deathsByAbility: Record<string, number> = {};
      let totalTime = 0;
      
      for (const death of data.deaths) {
        const ability = death.killingAbility || 'Dégâts divers';
        deathsByAbility[ability] = (deathsByAbility[ability] || 0) + 1;
        totalTime += death.fightTimeSeconds;
      }
      
      return {
        playerName,
        totalDeaths: data.deaths.length,
        deathsByAbility,
        averageDeathTime: data.deaths.length > 0 ? totalTime / data.deaths.length : 0,
        firstDeathCount: data.firstDeathCount,
      };
    })
    .sort((a, b) => b.totalDeaths - a.totalDeaths);

  // Classement abilities
  const abilityRanking: AbilityFailStats[] = Object.entries(abilityStats)
    .map(([abilityName, data]) => {
      const playerVictims: Record<string, number> = {};
      let totalTime = 0;
      
      for (const kill of data.kills) {
        playerVictims[kill.playerName] = (playerVictims[kill.playerName] || 0) + 1;
        totalTime += kill.fightTimeSeconds;
      }
      
      return {
        abilityName,
        totalKills: data.kills.length,
        playerVictims,
        averageKillTime: data.kills.length > 0 ? totalTime / data.kills.length : 0,
      };
    })
    .sort((a, b) => b.totalKills - a.totalKills);

  // Combos mortels
  const comboCount: Record<string, number> = {};
  for (const death of allDeaths) {
    const key = `${death.playerName}|||${death.killingAbility || 'Dégâts divers'}`;
    comboCount[key] = (comboCount[key] || 0) + 1;
  }
  
  const deadlyCombos = Object.entries(comboCount)
    .map(([key, count]) => {
      const [player, ability] = key.split('|||');
      return { player, ability, count };
    })
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Morts par phase
  const phases = [
    { name: '0-30s', min: 0, max: 30 },
    { name: '30s-1min', min: 30, max: 60 },
    { name: '1-2min', min: 60, max: 120 },
    { name: '2-3min', min: 120, max: 180 },
    { name: '3-5min', min: 180, max: 300 },
    { name: '5min+', min: 300, max: Infinity },
  ];
  
  const deathsByPhase = phases.map(phase => {
    const phaseDeaths = allDeaths.filter(
      d => d.fightTimeSeconds >= phase.min && d.fightTimeSeconds < phase.max
    );
    const players = Array.from(new Set(phaseDeaths.map(d => d.playerName)));
    return {
      phase: phase.name,
      count: phaseDeaths.length,
      players,
    };
  }).filter(p => p.count > 0);

  // Stats de survie par joueur
  const survivalStats: PlayerSurvivalStats[] = Object.entries(playerSurvivalData)
    .map(([playerName, data]) => {
      const totalFightsPresent = data.fightDurations.length;
      const totalDeaths = data.deathTimes.length;
      const deathsBeforeWipeCall = data.deathTimesBeforeWipe.length;
      const deathsAfterWipeCall = data.deathTimesAfterWipe.length;
      const fightsSurvivedFull = data.fightsSurvived;
      
      // Temps moyen de survie global
      const averageSurvivalTime = data.deathTimes.length > 0
        ? data.deathTimes.reduce((a, b) => a + b, 0) / data.deathTimes.length
        : 0;
      
      // Temps moyen de survie avant wipe call
      const averageSurvivalTimeBeforeWipe = data.deathTimesBeforeWipe.length > 0
        ? data.deathTimesBeforeWipe.reduce((a, b) => a + b, 0) / data.deathTimesBeforeWipe.length
        : 0;
      
      // Temps moyen de survie après wipe call
      const averageSurvivalTimeAfterWipe = data.deathTimesAfterWipe.length > 0
        ? data.deathTimesAfterWipe.reduce((a, b) => a + b, 0) / data.deathTimesAfterWipe.length
        : 0;
      
      const survivalRate = totalFightsPresent > 0
        ? (fightsSurvivedFull / totalFightsPresent) * 100
        : 0;
      
      return {
        playerName,
        totalFightsPresent,
        totalDeaths,
        deathsBeforeWipeCall,
        deathsAfterWipeCall,
        fightsSurvivedFull,
        averageSurvivalTime,
        averageSurvivalTimeBeforeWipe,
        averageSurvivalTimeAfterWipe,
        survivalTimes: data.deathTimes,
        survivalTimesBeforeWipe: data.deathTimesBeforeWipe,
        survivalTimesAfterWipe: data.deathTimesAfterWipe,
        survivalRate,
      };
    })
    .sort((a, b) => b.averageSurvivalTime - a.averageSurvivalTime); // Trier par temps de survie décroissant

  // Moyenne globale de survie
  const allSurvivalTimes = survivalStats.flatMap(s => s.survivalTimes);
  const globalAverageSurvival = allSurvivalTimes.length > 0
    ? allSurvivalTimes.reduce((a, b) => a + b, 0) / allSurvivalTimes.length
    : 0;

  const failAnalysis: FailAnalysis = {
    playerRanking,
    abilityRanking,
    deadlyCombos,
    deathsByPhase,
    firstDeaths: firstDeaths.slice(0, 20),
    criticalDeathsByNight,
    survivalStats,
    globalAverageSurvival,
  };

  return {
    bossName,
    difficulty,
    comparisons,
    totalAttempts,
    totalKills,
    totalWipes,
    averageDeathsBeforeWipe,
    mostDeadlyAbilities,
    failAnalysis,
  };
}
