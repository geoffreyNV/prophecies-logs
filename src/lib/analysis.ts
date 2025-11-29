import { Death, DeathAnalysis, FightComparison, BossComparison } from '@/types';
import { getReport, getFightDeaths, getFightSummary } from './warcraftlogs';

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

function detectWipeCall(deaths: Death[], fightDuration: number): number | undefined {
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
  fightsSurvivedFull: number; // Fights où il n'est pas mort
  averageSurvivalTime: number; // Temps moyen avant de mourir
  survivalTimes: number[]; // Tous les temps de survie pour calculer la médiane
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
    fightsSurvived: number;
  }> = {};

  for (const reportCode of reportCodes) {
    console.log(`Processing report: ${reportCode}`);
    const report = await getReport(reportCode) as {
      startTime: number;
      fights: FightInfo[];
    } | null;
    
    if (!report) {
      console.log(`Report ${reportCode} not found`);
      continue;
    }

    const reportDate = new Date(report.startTime).toISOString().split('T')[0];
    
    const nightData: NightCriticalDeaths = {
      date: reportDate,
      reportCode,
      attempts: [],
    };

    const matchingFights = (report.fights || []).filter(
      (f: FightInfo) =>
        f.name.toLowerCase().includes(bossName.toLowerCase()) &&
        (difficulty === undefined || f.difficulty === difficulty)
    );

    console.log(`Report ${reportCode}: Found ${matchingFights.length} fights for "${bossName}"`);

    let attemptNumber = 0;
    for (const fight of matchingFights) {
      attemptNumber++;
      const fightId = fight.id;

      try {
        const deathAnalysis = await analyzeFightDeaths(reportCode, fightId);
        const duration = (fight.endTime - fight.startTime) / 1000;

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
          
          // Stats de survie
          if (!playerSurvivalData[death.playerName]) {
            playerSurvivalData[death.playerName] = {
              fightDurations: [],
              deathTimes: [],
              fightsSurvived: 0,
            };
          }
          // Temps de survie = temps avant de mourir
          playerSurvivalData[death.playerName].deathTimes.push(death.fightTimeSeconds);
          playerSurvivalData[death.playerName].fightDurations.push(duration);
        }
        
        // Pour les joueurs qui ont survécu ce fight (sont morts mais après le wipe call, ou pas morts du tout)
        // On considère qu'ils ont survécu la durée totale du fight
        const allPlayersThisFight = new Set(Array.from(playersWhoDeadThisFight).concat(deathAnalysis.deaths.map(d => d.playerName)));
        allPlayersThisFight.forEach(player => {
          if (!playerSurvivalData[player]) {
            playerSurvivalData[player] = {
              fightDurations: [],
              deathTimes: [],
              fightsSurvived: 0,
            };
          }
          
          // Si pas mort avant le wipe call, on compte comme survécu
          if (!playersWhoDeadThisFight.has(player)) {
            playerSurvivalData[player].fightsSurvived++;
            playerSurvivalData[player].deathTimes.push(duration); // A survécu tout le fight
            playerSurvivalData[player].fightDurations.push(duration);
          }
        });
        
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
      const totalDeaths = data.deathTimes.filter((t, i) => t < data.fightDurations[i]).length;
      const fightsSurvivedFull = data.fightsSurvived;
      const averageSurvivalTime = data.deathTimes.length > 0
        ? data.deathTimes.reduce((a, b) => a + b, 0) / data.deathTimes.length
        : 0;
      const survivalRate = totalFightsPresent > 0
        ? (fightsSurvivedFull / totalFightsPresent) * 100
        : 0;
      
      return {
        playerName,
        totalFightsPresent,
        totalDeaths,
        fightsSurvivedFull,
        averageSurvivalTime,
        survivalTimes: data.deathTimes,
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
