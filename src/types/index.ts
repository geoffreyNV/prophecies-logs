export interface Fight {
  id: number;
  name: string;
  encounterID: number;
  startTime: number;
  endTime: number;
  kill: boolean;
  difficulty?: number;
  fightPercentage?: number;
  lastPhase?: number;
}

export interface Report {
  code: string;
  title: string;
  date: string;
  zoneName?: string;
  owner?: string;
  fights: Fight[];
}

export interface Death {
  timestamp: number;
  playerName: string;
  playerId: number;
  killingAbility?: string;
  killingAbilityId?: number;
  killingSource?: string;
  fightTimeSeconds: number;
  isAfterWipeCall: boolean;
}

export interface DeathAnalysis {
  fightId: number;
  fightName: string;
  totalDeaths: number;
  deathsBeforeWipe: number;
  deathsAfterWipe: number;
  estimatedWipeCallTime?: number;
  deaths: Death[];
}

export interface FightComparison {
  reportCode: string;
  reportDate: string;
  fightId: number;
  attemptNumber: number;
  durationSeconds: number;
  kill: boolean;
  fightPercentage?: number;
  deathAnalysis: DeathAnalysis;
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
  survivalStats: PlayerSurvivalStats[];
  globalAverageSurvival: number;
}

export interface BossComparison {
  bossName: string;
  difficulty?: number;
  comparisons: FightComparison[];
  totalAttempts: number;
  totalKills: number;
  totalWipes: number;
  averageDeathsBeforeWipe: number;
  mostDeadlyAbilities: { ability: string; deathCount: number }[];
  failAnalysis?: FailAnalysis;
}

export interface Boss {
  name: string;
  encounterID: number;
  difficulty?: number;
  attempts: number;
  kills: number;
}
