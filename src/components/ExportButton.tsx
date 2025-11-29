'use client';

import { useState } from 'react';
import { BossComparison } from '@/types';

interface ExportButtonProps {
  comparison: BossComparison;
}

type ExportFormat = 'csv' | 'json';

export default function ExportButton({ comparison }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateCSV = (): string => {
    const lines: string[] = [];
    const failAnalysis = comparison.failAnalysis;

    // En-tête général
    lines.push('=== RAPPORT D\'ANALYSE DE RAID ===');
    lines.push(`Boss: ${comparison.bossName}`);
    lines.push(`Tentatives: ${comparison.totalAttempts}`);
    lines.push(`Kills: ${comparison.totalKills}`);
    lines.push(`Wipes: ${comparison.totalWipes}`);
    lines.push(`Taux de réussite: ${comparison.totalAttempts > 0 ? Math.round((comparison.totalKills / comparison.totalAttempts) * 100) : 0}%`);
    lines.push(`Morts moyennes avant wipe: ${comparison.averageDeathsBeforeWipe.toFixed(1)}`);
    lines.push('');

    // Temps de survie
    if (failAnalysis?.survivalStats && failAnalysis.survivalStats.length > 0) {
      lines.push('=== TEMPS DE SURVIE PAR JOUEUR ===');
      lines.push('Rang,Joueur,Temps Moyen,Morts,vs Moyenne');
      failAnalysis.survivalStats.forEach((player, index) => {
        const diff = player.averageSurvivalTime - failAnalysis.globalAverageSurvival;
        lines.push(`${index + 1},${player.playerName},${formatDuration(player.averageSurvivalTime)},${player.totalDeaths},${diff >= 0 ? '+' : ''}${formatDuration(diff)}`);
      });
      lines.push(`Moyenne globale: ${formatDuration(failAnalysis.globalAverageSurvival)}`);
      lines.push('');
    }

    // Hall of Shame
    if (failAnalysis?.playerRanking && failAnalysis.playerRanking.length > 0) {
      lines.push('=== HALL OF SHAME (QUI MEURT LE PLUS) ===');
      lines.push('Rang,Joueur,Morts,Premier Mort,Temps Moyen Survie');
      failAnalysis.playerRanking.forEach((player, index) => {
        lines.push(`${index + 1},${player.playerName},${player.totalDeaths},${player.firstDeathCount}x,${formatDuration(player.averageDeathTime)}`);
      });
      lines.push('');
    }

    // Abilities mortelles
    if (failAnalysis?.abilityRanking && failAnalysis.abilityRanking.length > 0) {
      lines.push('=== ABILITIES LES PLUS MORTELLES ===');
      lines.push('Rang,Ability,Kills,Temps Moyen');
      failAnalysis.abilityRanking.forEach((ability, index) => {
        lines.push(`${index + 1},${ability.abilityName},${ability.totalKills},${formatDuration(ability.averageKillTime)}`);
      });
      lines.push('');
    }

    // Combos fatals
    if (failAnalysis?.deadlyCombos && failAnalysis.deadlyCombos.length > 0) {
      lines.push('=== COMBOS FATALS RECURRENTS ===');
      lines.push('Rang,Joueur,Ability,Occurrences');
      failAnalysis.deadlyCombos.forEach((combo, index) => {
        lines.push(`${index + 1},${combo.player},${combo.ability},${combo.count}x`);
      });
      lines.push('');
    }

    // Morts par phase
    if (failAnalysis?.deathsByPhase && failAnalysis.deathsByPhase.length > 0) {
      lines.push('=== MORTS PAR PHASE DE COMBAT ===');
      lines.push('Phase,Morts,Joueurs concernés');
      failAnalysis.deathsByPhase.forEach((phase) => {
        lines.push(`${phase.phase},${phase.count},${phase.players.length}`);
      });
      lines.push('');
    }

    // Détail par soirée
    if (failAnalysis?.criticalDeathsByNight && failAnalysis.criticalDeathsByNight.length > 0) {
      lines.push('=== DETAIL PAR SOIREE ===');
      failAnalysis.criticalDeathsByNight.forEach((night) => {
        lines.push(`--- ${night.date} ---`);
        lines.push('Try,%,1ere Mort,2eme Mort,3eme Mort');
        night.attempts.forEach((attempt) => {
          if (attempt.kill) {
            lines.push(`#${attempt.attemptNumber},KILL,-,-,-`);
          } else {
            const deaths = attempt.criticalDeaths;
            lines.push(`#${attempt.attemptNumber},${attempt.fightPercentage?.toFixed(1) || '-'}%,${deaths[0]?.player || '-'} (${deaths[0]?.ability || '-'}),${deaths[1]?.player || '-'} (${deaths[1]?.ability || '-'}),${deaths[2]?.player || '-'} (${deaths[2]?.ability || '-'})`);
          }
        });
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  const generateJSON = (): string => {
    const exportData = {
      exportDate: new Date().toISOString(),
      boss: {
        name: comparison.bossName,
        difficulty: comparison.difficulty,
      },
      summary: {
        totalAttempts: comparison.totalAttempts,
        totalKills: comparison.totalKills,
        totalWipes: comparison.totalWipes,
        successRate: comparison.totalAttempts > 0 
          ? Math.round((comparison.totalKills / comparison.totalAttempts) * 100) 
          : 0,
        averageDeathsBeforeWipe: comparison.averageDeathsBeforeWipe,
      },
      survivalStats: comparison.failAnalysis?.survivalStats.map((p, i) => ({
        rank: i + 1,
        player: p.playerName,
        averageSurvivalSeconds: Math.round(p.averageSurvivalTime),
        totalDeaths: p.totalDeaths,
        fightsSurvived: p.fightsSurvivedFull,
      })),
      globalAverageSurvival: comparison.failAnalysis?.globalAverageSurvival,
      playerRanking: comparison.failAnalysis?.playerRanking.map((p, i) => ({
        rank: i + 1,
        player: p.playerName,
        totalDeaths: p.totalDeaths,
        firstDeathCount: p.firstDeathCount,
        averageDeathTime: Math.round(p.averageDeathTime),
        deathsByAbility: p.deathsByAbility,
      })),
      abilityRanking: comparison.failAnalysis?.abilityRanking.map((a, i) => ({
        rank: i + 1,
        ability: a.abilityName,
        totalKills: a.totalKills,
        averageKillTime: Math.round(a.averageKillTime),
        victims: a.playerVictims,
      })),
      deadlyCombos: comparison.failAnalysis?.deadlyCombos,
      deathsByPhase: comparison.failAnalysis?.deathsByPhase,
      criticalDeathsByNight: comparison.failAnalysis?.criticalDeathsByNight,
      mostDeadlyAbilities: comparison.mostDeadlyAbilities,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleExport = (format: ExportFormat) => {
    const date = new Date().toISOString().split('T')[0];
    const bossSlug = comparison.bossName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (format === 'csv') {
      const csv = generateCSV();
      downloadFile(csv, `raid-analysis-${bossSlug}-${date}.csv`, 'text/csv;charset=utf-8');
    } else {
      const json = generateJSON();
      downloadFile(json, `raid-analysis-${bossSlug}-${date}.json`, 'application/json');
    }
  };

  const copyToClipboard = async () => {
    const text = generateCSV();
    try {
      await navigator.clipboard.writeText(text);
      alert('Données copiées dans le presse-papier !');
      setIsOpen(false);
    } catch {
      alert('Erreur lors de la copie');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary px-4 py-2 rounded-lg font-display text-sm flex items-center gap-2"
      >
        <span>📥</span>
        Exporter
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 bg-[--bg-card] border border-[--border-color] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
            <div className="p-2">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-[--bg-medium] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📄</span>
                <div>
                  <div className="font-semibold">Export CSV</div>
                  <div className="text-xs text-[--text-muted]">Compatible Excel/Sheets</div>
                </div>
              </button>
              
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-[--bg-medium] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📋</span>
                <div>
                  <div className="font-semibold">Export JSON</div>
                  <div className="text-xs text-[--text-muted]">Données structurées</div>
                </div>
              </button>

              <div className="border-t border-[--border-color] my-2" />
              
              <button
                onClick={copyToClipboard}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-[--bg-medium] transition-colors flex items-center gap-3"
              >
                <span className="text-xl">📎</span>
                <div>
                  <div className="font-semibold">Copier</div>
                  <div className="text-xs text-[--text-muted]">Dans le presse-papier</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

