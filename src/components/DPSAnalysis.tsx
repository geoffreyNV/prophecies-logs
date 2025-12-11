'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface DPSPlayerStats {
  name: string;
  spec?: string;
  averageDPS: number;
  medianDPS: number;
  minDPS: number;
  maxDPS: number;
  totalDamage: number;
  fightCount: number;
  consistency: number;
  specComparison?: {
    specAverageDPS: number;
    specMedianDPS: number;
    vsAverage: number;
    vsMedian: number;
    sampleSize: number;
  };
}

interface DPSData {
  bossName: string;
  totalFights: number;
  averageFightDuration: number;
  timeFilter: {
    start?: number;
    end?: number;
  };
  globalAverageDPS: number;
  players: DPSPlayerStats[];
}

interface DPSAnalysisProps {
  reportCodes: string[];
  bossName: string;
  difficulty?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const TIME_PRESETS = [
  { label: 'Tout le combat', start: undefined, end: undefined },
  { label: '0 - 30s (Opener)', start: 0, end: 30 },
  { label: '30s - 1min', start: 30, end: 60 },
  { label: '1min - 2min', start: 60, end: 120 },
  { label: '2min - 3min', start: 120, end: 180 },
  { label: '3min+', start: 180, end: undefined },
  { label: 'Première minute', start: 0, end: 60 },
  { label: 'Après 1min', start: 60, end: undefined },
];

export default function DPSAnalysis({ reportCodes, bossName, difficulty }: DPSAnalysisProps) {
  const [dpsData, setDpsData] = useState<DPSData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const fetchDPS = async (startTime?: number, endTime?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportCodes,
          bossName,
          difficulty,
          startTime,
          endTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la récupération des DPS');
      }

      const data = await response.json();
      setDpsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = (index: number) => {
    setSelectedPreset(index);
    const preset = TIME_PRESETS[index];
    fetchDPS(preset.start, preset.end);
  };

  const handleCustomFilter = () => {
    const start = customStart ? parseInt(customStart) : undefined;
    const end = customEnd ? parseInt(customEnd) : undefined;
    setSelectedPreset(-1);
    fetchDPS(start, end);
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getConsistencyColor = (consistency: number) => {
    if (consistency >= 80) return 'text-green-500';
    if (consistency >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDPSBarColor = (dps: number, globalAvg: number) => {
    if (dps >= globalAvg * 1.2) return 'bg-purple-500';
    if (dps >= globalAvg) return 'bg-green-500';
    if (dps >= globalAvg * 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Filtres de temps */}
      <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-4">
        <h4 className="font-display text-lg mb-4 text-[--accent-gold]">⏱️ Filtre de timing</h4>
        
        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TIME_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetChange(index)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                selectedPreset === index
                  ? 'bg-[--accent-gold] text-[--bg-darkest] font-semibold'
                  : 'bg-[--bg-dark] text-[--text-secondary] hover:bg-[--bg-card-hover]'
              } disabled:opacity-50`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Filtre personnalisé */}
        <div className="flex items-center gap-4 pt-4 border-t border-[--border-color]">
          <span className="text-sm text-[--text-muted]">Personnalisé:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Début (s)"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-24 px-3 py-2 rounded-lg input-dark text-sm"
            />
            <span className="text-[--text-muted]">→</span>
            <input
              type="number"
              placeholder="Fin (s)"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-24 px-3 py-2 rounded-lg input-dark text-sm"
            />
            <button
              onClick={handleCustomFilter}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg btn-secondary text-sm disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>

      {/* État de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner" />
          <span className="ml-4 text-[--accent-gold]">Analyse des DPS en cours...</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Résultats */}
      {dpsData && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-4 text-center">
              <div className="font-display text-3xl font-bold text-[--accent-gold]">
                {formatNumber(dpsData.globalAverageDPS)}
              </div>
              <div className="text-sm text-[--text-muted] uppercase">DPS Moyen Global</div>
            </div>
            <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-4 text-center">
              <div className="font-display text-3xl font-bold text-[--accent-purple-light]">
                {dpsData.totalFights}
              </div>
              <div className="text-sm text-[--text-muted] uppercase">Combats analysés</div>
            </div>
            <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-4 text-center">
              <div className="font-display text-3xl font-bold text-[--accent-blue]">
                {formatDuration(dpsData.averageFightDuration)}
              </div>
              <div className="text-sm text-[--text-muted] uppercase">Durée moyenne</div>
            </div>
            <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-bold text-[--accent-green]">
                {dpsData.timeFilter.start !== undefined || dpsData.timeFilter.end !== undefined
                  ? `${dpsData.timeFilter.start ?? 0}s - ${dpsData.timeFilter.end ?? '∞'}s`
                  : 'Tout le combat'}
              </div>
              <div className="text-sm text-[--text-muted] uppercase">Période analysée</div>
            </div>
          </div>

          {/* Tableau DPS */}
          <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[--bg-dark] border-b border-[--border-color]">
                  <th className="px-4 py-3 text-left font-display text-[--text-muted] w-16">#</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">Joueur</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">DPS Moyen</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted] hidden md:table-cell">Visualisation</th>
                  <th className="px-4 py-3 text-center font-display text-[--text-muted] hidden sm:table-cell">Min / Max</th>
                  <th className="px-4 py-3 text-center font-display text-[--text-muted]">Régularité</th>
                  <th className="px-4 py-3 text-center font-display text-[--text-muted] hidden lg:table-cell">vs Moyenne</th>
                  <th className="px-4 py-3 text-center font-display text-[--text-muted] hidden xl:table-cell">vs Spec</th>
                </tr>
              </thead>
              <tbody>
                {dpsData.players.map((player, index) => {
                  const maxDPS = Math.max(...dpsData.players.map(p => p.averageDPS), 1);
                  const barWidth = (player.averageDPS / maxDPS) * 100;
                  const diff = player.averageDPS - dpsData.globalAverageDPS;
                  const diffPercent = dpsData.globalAverageDPS > 0 
                    ? (diff / dpsData.globalAverageDPS) * 100 
                    : 0;

                  return (
                    <motion.tr
                      key={player.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-[--border-color] hover:bg-[--bg-card-hover] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xl">{getRankEmoji(index + 1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{player.name}</span>
                          {player.spec && (
                            <span className="text-xs text-[--accent-purple-light]">{player.spec}</span>
                          )}
                          <span className="text-xs text-[--text-muted]">({player.fightCount} fights)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-lg font-bold text-[--accent-gold]">
                          {formatNumber(player.averageDPS)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="w-full bg-[--bg-dark] rounded-full h-4 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.5, delay: index * 0.03 }}
                            className={`h-full ${getDPSBarColor(player.averageDPS, dpsData.globalAverageDPS)} rounded-full`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="text-sm text-[--text-muted]">
                          {formatNumber(player.minDPS)} / {formatNumber(player.maxDPS)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-semibold ${getConsistencyColor(player.consistency)}`}>
                          {player.consistency}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className={`font-mono font-semibold ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{formatNumber(diff)}
                          <span className="text-xs ml-1">({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(0)}%)</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden xl:table-cell">
                        {player.specComparison ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-mono font-semibold text-sm ${
                              player.specComparison.vsAverage >= 100 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {player.specComparison.vsAverage >= 100 ? '+' : ''}
                              {(player.specComparison.vsAverage - 100).toFixed(1)}%
                            </span>
                            <span className="text-xs text-[--text-muted]">
                              vs {formatNumber(player.specComparison.specAverageDPS)}
                            </span>
                            <span className="text-xs text-[--text-muted]">
                              (n={player.specComparison.sampleSize})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[--text-muted]">N/A</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500" />
              <span className="text-[--text-muted]">&gt; +20% moyenne (Excellent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-[--text-muted]">Au-dessus moyenne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-[--text-muted]">Proche moyenne</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-[--text-muted]">&lt; -20% moyenne</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Message initial */}
      {!dpsData && !isLoading && !error && (
        <div className="text-center py-12 text-[--text-muted]">
          <p className="text-lg mb-4">Sélectionne une période pour analyser les DPS</p>
          <button
            onClick={() => handlePresetChange(0)}
            className="btn-primary px-6 py-3 rounded-lg font-display"
          >
            Analyser tout le combat
          </button>
        </div>
      )}
    </div>
  );
}

