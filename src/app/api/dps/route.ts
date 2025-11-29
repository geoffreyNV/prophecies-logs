import { NextResponse } from 'next/server';
import { getReport, getFightDPS } from '@/lib/warcraftlogs';

interface DPSRequest {
  reportCodes: string[];
  bossName: string;
  difficulty?: number;
  startTime?: number; // En secondes depuis le début du fight
  endTime?: number;   // En secondes depuis le début du fight
}

interface DPSEntry {
  name: string;
  id: number;
  guid: number;
  type: string;
  icon: string;
  total: number;
  activeTime: number;
  activeTimeReduced: number;
  abilities?: Array<{
    name: string;
    total: number;
    type: number;
  }>;
}

interface FightInfo {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  kill: boolean;
  difficulty?: number;
  fightPercentage?: number;
}

export async function POST(request: Request) {
  try {
    const body: DPSRequest = await request.json();

    if (!body.reportCodes || body.reportCodes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins 1 rapport est requis' },
        { status: 400 }
      );
    }

    if (!body.bossName) {
      return NextResponse.json(
        { error: 'Le nom du boss est requis' },
        { status: 400 }
      );
    }

    console.log(`Fetching DPS data for ${body.bossName}, time filter: ${body.startTime}s - ${body.endTime}s`);

    // Collecter les DPS de tous les reports
    const allPlayerDPS: Record<string, {
      name: string;
      totalDamage: number;
      totalTime: number;
      fightCount: number;
      dpsByFight: number[];
    }> = {};

    let totalFights = 0;
    let totalDuration = 0;

    for (const reportCode of body.reportCodes) {
      const report = await getReport(reportCode) as {
        startTime: number;
        fights: FightInfo[];
      } | null;

      if (!report) continue;

      const matchingFights = (report.fights || []).filter(
        (f: FightInfo) =>
          f.name.toLowerCase().includes(body.bossName.toLowerCase()) &&
          (body.difficulty === undefined || f.difficulty === body.difficulty)
      );

      for (const fight of matchingFights) {
        try {
          const dpsData = await getFightDPS(
            reportCode,
            fight.id,
            body.startTime,
            body.endTime
          ) as {
            table?: { data?: { entries?: DPSEntry[] } };
            fightDuration: number;
            fights?: FightInfo[];
          } | null;

          if (!dpsData?.table) continue;

          // La table peut avoir différents formats
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tableData = dpsData.table as any;
          const entries: DPSEntry[] = tableData?.data?.entries || tableData?.entries || [];

          // Calculer la durée effective (avec ou sans filtre)
          let effectiveDuration = dpsData.fightDuration;
          if (body.startTime !== undefined && body.endTime !== undefined) {
            effectiveDuration = Math.min(body.endTime, dpsData.fightDuration) - body.startTime;
          } else if (body.endTime !== undefined) {
            effectiveDuration = Math.min(body.endTime, dpsData.fightDuration);
          } else if (body.startTime !== undefined) {
            effectiveDuration = dpsData.fightDuration - body.startTime;
          }

          if (effectiveDuration <= 0) continue;

          totalFights++;
          totalDuration += effectiveDuration;

          for (const entry of entries) {
            // Seulement les joueurs DPS/Heal (pas les pets, pas les tanks)
            if (entry.type === 'Pet' || entry.type === 'NPC') continue;

            const playerName = entry.name;
            const damage = entry.total || 0;
            const dps = effectiveDuration > 0 ? damage / effectiveDuration : 0;

            if (!allPlayerDPS[playerName]) {
              allPlayerDPS[playerName] = {
                name: playerName,
                totalDamage: 0,
                totalTime: 0,
                fightCount: 0,
                dpsByFight: [],
              };
            }

            allPlayerDPS[playerName].totalDamage += damage;
            allPlayerDPS[playerName].totalTime += effectiveDuration;
            allPlayerDPS[playerName].fightCount++;
            allPlayerDPS[playerName].dpsByFight.push(dps);
          }
        } catch (error) {
          console.error(`Error fetching DPS for fight ${fight.id}:`, error);
        }
      }
    }

    // Calculer les moyennes
    const playerStats = Object.values(allPlayerDPS).map((player) => {
      const averageDPS = player.totalTime > 0 ? player.totalDamage / player.totalTime : 0;
      const medianDPS = calculateMedian(player.dpsByFight);
      const minDPS = Math.min(...player.dpsByFight);
      const maxDPS = Math.max(...player.dpsByFight);

      return {
        name: player.name,
        averageDPS: Math.round(averageDPS),
        medianDPS: Math.round(medianDPS),
        minDPS: Math.round(minDPS),
        maxDPS: Math.round(maxDPS),
        totalDamage: player.totalDamage,
        fightCount: player.fightCount,
        consistency: player.dpsByFight.length > 1 
          ? Math.round((1 - (standardDeviation(player.dpsByFight) / averageDPS)) * 100)
          : 100,
      };
    }).sort((a, b) => b.averageDPS - a.averageDPS);

    // Calculer la moyenne globale
    const globalAverageDPS = playerStats.length > 0
      ? playerStats.reduce((sum, p) => sum + p.averageDPS, 0) / playerStats.length
      : 0;

    return NextResponse.json({
      bossName: body.bossName,
      totalFights,
      averageFightDuration: totalFights > 0 ? totalDuration / totalFights : 0,
      timeFilter: {
        start: body.startTime,
        end: body.endTime,
      },
      globalAverageDPS: Math.round(globalAverageDPS),
      players: playerStats,
    });
  } catch (error) {
    console.error('Error fetching DPS:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squareDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / numbers.length);
}

