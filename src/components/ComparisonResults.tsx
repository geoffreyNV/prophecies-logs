'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BossComparison, FightComparison, PlayerFailStats, AbilityFailStats, NightCriticalDeaths, PlayerSurvivalStats } from '@/types';
import DPSAnalysis from './DPSAnalysis';
import ExportButton from './ExportButton';
import SpellTooltip from './SpellTooltip';
import { getSpellTranslation } from '@/lib/wowhead-translations';

interface ComparisonResultsProps {
  comparison: BossComparison;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

type TabType = 'survival' | 'dps' | 'critical' | 'overview' | 'players' | 'abilities' | 'combos' | 'timeline';

function StatCard({ value, label, color, subtext }: { value: string | number; label: string; color: string; subtext?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-6 text-center card-hover transition-all"
    >
      <div className={`font-display text-4xl font-bold mb-2 ${color}`}>{value}</div>
      <div className="text-sm text-[--text-secondary] uppercase tracking-widest">{label}</div>
      {subtext && <div className="text-xs text-[--text-muted] mt-1">{subtext}</div>}
    </motion.div>
  );
}

function SurvivalTable({ stats, globalAverage }: { stats: PlayerSurvivalStats[]; globalAverage: number }) {
  // Trier par temps de survie décroissant
  const sortedStats = [...stats].sort((a, b) => b.averageSurvivalTime - a.averageSurvivalTime);
  
  const getBarColor = (time: number) => {
    if (time >= globalAverage * 1.2) return 'bg-green-500';
    if (time >= globalAverage * 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const maxTime = Math.max(...stats.map(s => s.averageSurvivalTime), 1);

  return (
    <div className="space-y-4">
      {/* Global average */}
      <div className="bg-[--bg-medium] border border-[--accent-gold] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[--text-muted] uppercase tracking-wide">Moyenne globale de survie</div>
            <div className="font-display text-3xl font-bold text-[--accent-gold]">{formatDuration(globalAverage)}</div>
          </div>
          <div className="text-6xl">⏱️</div>
        </div>
      </div>

      {/* Explication wipe call */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <div className="font-semibold text-blue-400 mb-1">Qu'est-ce que le "wipe call" ?</div>
            <div className="text-sm text-[--text-muted]">
              Le wipe call est détecté automatiquement lorsqu'il y a <strong className="text-white">4 morts ou plus en moins de 10 secondes</strong> après la moitié du combat.
              Les morts <span className="text-yellow-400 font-semibold">avant le wipe call</span> sont les morts importantes qui ont causé l'échec.
              Les morts <span className="text-orange-400 font-semibold">après le wipe call</span> sont celles qui se produisent quand le groupe a déjà abandonné.
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[--bg-dark] border-b border-[--border-color]">
              <th className="px-4 py-3 text-left font-display text-[--text-muted] w-16">#</th>
              <th className="px-4 py-3 text-left font-display text-[--text-muted]">Joueur</th>
              <th className="px-4 py-3 text-left font-display text-[--text-muted]">Temps moyen</th>
              <th className="px-4 py-3 text-left font-display text-[--text-muted] hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span>
                  <span>Avant wipe call</span>
                  <span className="text-xs text-[--text-muted]">(mort importante)</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left font-display text-[--text-muted] hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">⏸️</span>
                  <span>Après wipe call</span>
                  <span className="text-xs text-[--text-muted]">(abandon)</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left font-display text-[--text-muted] hidden md:table-cell">Visualisation</th>
              <th className="px-4 py-3 text-center font-display text-[--text-muted]">Morts</th>
              <th className="px-4 py-3 text-center font-display text-[--text-muted] hidden sm:table-cell">vs Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((player, index) => {
              const diff = player.averageSurvivalTime - globalAverage;
              const diffPercent = globalAverage > 0 ? (diff / globalAverage) * 100 : 0;
              const barWidth = (player.averageSurvivalTime / maxTime) * 100;
              
              return (
                <motion.tr
                  key={player.playerName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-[--border-color] hover:bg-[--bg-card-hover] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-xl">{getRankEmoji(index + 1)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{player.playerName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-lg font-bold ${getBarColor(player.averageSurvivalTime).replace('bg-', 'text-')}`}>
                      {formatDuration(player.averageSurvivalTime)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {player.deathsBeforeWipeCall > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-400 text-xs">⚡</span>
                          <span className="font-mono text-sm font-semibold text-yellow-400">
                            {formatDuration(player.averageSurvivalTimeBeforeWipe)}
                          </span>
                        </div>
                        <span className="text-xs text-yellow-400/70 ml-5">
                          {player.deathsBeforeWipeCall} mort{player.deathsBeforeWipeCall > 1 ? 's' : ''} importante{player.deathsBeforeWipeCall > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[--text-muted] italic">Aucune mort importante</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {player.deathsAfterWipeCall > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-orange-400 text-xs">⏸️</span>
                          <span className="font-mono text-sm font-semibold text-orange-400">
                            {formatDuration(player.averageSurvivalTimeAfterWipe)}
                          </span>
                        </div>
                        <span className="text-xs text-orange-400/70 ml-5">
                          {player.deathsAfterWipeCall} mort{player.deathsAfterWipeCall > 1 ? 's' : ''} après abandon
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[--text-muted] italic">Aucune mort après abandon</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="w-full bg-[--bg-dark] rounded-full h-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5, delay: index * 0.03 }}
                        className={`h-full ${getBarColor(player.averageSurvivalTime)} rounded-full`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[--accent-red] font-semibold text-lg">{player.totalDeaths}</span>
                      {(player.deathsBeforeWipeCall > 0 || player.deathsAfterWipeCall > 0) && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">⚡</span>
                            <span className="text-yellow-400 font-semibold">{player.deathsBeforeWipeCall}</span>
                          </div>
                          <span className="text-[--text-muted]">/</span>
                          <div className="flex items-center gap-1">
                            <span className="text-orange-400">⏸️</span>
                            <span className="text-orange-400 font-semibold">{player.deathsAfterWipeCall}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`font-mono font-semibold ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{formatDuration(diff)}
                      <span className="text-xs ml-1">({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(0)}%)</span>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-[--text-muted]">&gt; +20% moyenne</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-[--text-muted]">± 20% moyenne</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-[--text-muted]">&lt; -20% moyenne</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 justify-center text-sm pt-2 border-t border-[--border-color]">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚡</span>
            <span className="text-[--text-muted]">
              <strong className="text-yellow-400">Avant wipe call</strong> : Morts importantes qui causent l'échec
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-lg">⏸️</span>
            <span className="text-[--text-muted]">
              <strong className="text-orange-400">Après wipe call</strong> : Morts après l'abandon du groupe
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, rank }: { player: PlayerFailStats; rank: number }) {
  const topAbilities = Object.entries(player.deathsByAbility)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '💀';
    if (rank === 2) return '☠️';
    if (rank === 3) return '👻';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-red-600 to-red-900';
    if (rank === 2) return 'from-orange-600 to-orange-900';
    if (rank === 3) return 'from-yellow-600 to-yellow-900';
    return 'from-gray-600 to-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`bg-gradient-to-r ${getRankColor(rank)} p-1 rounded-xl`}
    >
      <div className="bg-[--bg-card] rounded-lg p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-3xl">{getMedalEmoji(rank)}</div>
          <div className="flex-1">
            <div className="font-display text-lg font-semibold">{player.playerName}</div>
            <div className="text-sm text-[--text-muted]">
              Temps moyen de survie: {formatDuration(player.averageDeathTime)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-[--accent-red]">{player.totalDeaths}</div>
            <div className="text-xs text-[--text-muted]">morts</div>
          </div>
        </div>
        
        {player.firstDeathCount > 0 && (
          <div className="mb-3 px-3 py-2 bg-[--bg-dark] rounded-lg border-l-4 border-[--accent-orange]">
            <span className="text-[--accent-orange] font-semibold">⚠️ Premier mort {player.firstDeathCount}x</span>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="text-xs text-[--text-muted] uppercase tracking-wide">Tué par:</div>
          {topAbilities.map(([ability, count]) => (
            <div key={ability} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-[--accent-red]" />
              <SpellTooltip abilityName={ability}>
                <span className="flex-1 truncate text-[--accent-purple-light] hover:text-[--accent-purple] transition-colors cursor-help">
                  {getSpellTranslation(ability).name}
                </span>
              </SpellTooltip>
              <span className="text-[--accent-red] font-semibold">{count}x</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AbilityCard({ ability, rank }: { ability: AbilityFailStats; rank: number }) {
  const topVictims = Object.entries(ability.playerVictims)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: rank * 0.05 }}
      className="bg-[--bg-medium] border border-[--border-color] rounded-xl overflow-hidden"
    >
      <div className="p-4 bg-gradient-to-r from-[--bg-dark] to-[--bg-medium] border-b border-[--border-color]">
        <div className="flex items-center gap-3">
          <div className="font-display text-2xl font-bold text-[--accent-gold]">#{rank}</div>
          <div className="flex-1">
            <SpellTooltip abilityName={ability.abilityName}>
              <div className="font-display font-semibold text-[--accent-purple-light] hover:text-[--accent-purple] transition-colors cursor-help">
                {getSpellTranslation(ability.abilityName).name}
              </div>
            </SpellTooltip>
            <div className="text-xs text-[--text-muted]">
              Tue en moyenne à {formatDuration(ability.averageKillTime)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-[--accent-red]">{ability.totalKills}</div>
            <div className="text-xs text-[--text-muted]">kills</div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="text-xs text-[--text-muted] uppercase tracking-wide mb-2">Victimes:</div>
        <div className="flex flex-wrap gap-2">
          {topVictims.map(([player, count]) => (
            <span key={player} className="px-2 py-1 bg-[--bg-dark] rounded text-sm">
              {player} <span className="text-[--accent-red]">({count})</span>
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ComboCard({ combo, rank }: { combo: { player: string; ability: string; count: number }; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.03 }}
      className="flex items-center gap-3 p-3 bg-[--bg-medium] border border-[--border-color] rounded-lg"
    >
      <div className="font-display font-bold text-[--accent-gold]">#{rank}</div>
      <div className="flex-1">
        <span className="font-semibold text-[--accent-purple-light]">{combo.player}</span>
        <span className="text-[--text-muted] mx-2">+</span>
        <SpellTooltip abilityName={combo.ability}>
          <span className="text-[--accent-purple-light] hover:text-[--accent-purple] transition-colors cursor-help">
            {getSpellTranslation(combo.ability).name}
          </span>
        </SpellTooltip>
      </div>
      <div className="px-3 py-1 bg-[--accent-red] text-white rounded-full font-semibold text-sm">
        {combo.count}x
      </div>
    </motion.div>
  );
}

function CriticalDeathsTable({ nightsData }: { nightsData: NightCriticalDeaths[] }) {
  const getDeathBadgeColor = (num: number) => {
    if (num === 1) return 'bg-red-600';
    if (num === 2) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-6">
      {nightsData.map((night) => (
        <div key={night.reportCode} className="bg-[--bg-medium] border border-[--border-color] rounded-xl overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-[--accent-gold]/20 to-transparent border-b border-[--border-color]">
            <h4 className="font-display text-lg font-semibold text-[--accent-gold]">
              📅 {night.date}
            </h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border-color] bg-[--bg-dark]">
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">Try</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">%</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">1ère mort</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">2ème mort</th>
                  <th className="px-4 py-3 text-left font-display text-[--text-muted]">3ème mort</th>
                </tr>
              </thead>
              <tbody>
                {night.attempts.filter(a => !a.kill).map((attempt) => (
                  <tr key={attempt.attemptNumber} className="border-b border-[--border-color] hover:bg-[--bg-card-hover] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-display font-semibold">#{attempt.attemptNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      {attempt.fightPercentage !== undefined ? (
                        <span className={`font-mono ${attempt.fightPercentage < 20 ? 'text-[--accent-green]' : attempt.fightPercentage < 50 ? 'text-[--accent-orange]' : 'text-[--accent-red]'}`}>
                          {attempt.fightPercentage.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    {[0, 1, 2].map((idx) => {
                      const death = attempt.criticalDeaths[idx];
                      return (
                        <td key={idx} className="px-4 py-3">
                          {death ? (
                            <div className="flex items-start gap-2">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${getDeathBadgeColor(death.deathNumber)} text-white text-xs font-bold shrink-0`}>
                                {death.deathNumber}
                              </span>
                              <div>
                                <div className="font-semibold text-[--accent-purple-light]">{death.player}</div>
                                <SpellTooltip abilityName={death.ability}>
                                  <div className="text-[--accent-purple-light] hover:text-[--accent-purple] transition-colors cursor-help text-xs">
                                    {getSpellTranslation(death.ability).name}
                                  </div>
                                </SpellTooltip>
                                <div className="text-[--text-muted] text-xs font-mono">{formatDuration(death.time)}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[--text-muted]">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {night.attempts.filter(a => a.kill).map((attempt) => (
                  <tr key={`kill-${attempt.attemptNumber}`} className="border-b border-[--border-color] bg-[--accent-green]/10">
                    <td className="px-4 py-3">
                      <span className="font-display font-semibold">#{attempt.attemptNumber}</span>
                    </td>
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="text-[--accent-green] font-semibold">✅ KILL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function NightCard({ night }: { night: { date: string; code: string; fights: FightComparison[] } }) {
  const kills = night.fights.filter((f) => f.kill).length;
  const wipes = night.fights.filter((f) => !f.kill).length;
  const totalDeathsBeforeWipe = night.fights
    .filter((f) => !f.kill)
    .reduce((sum, f) => sum + f.deathAnalysis.deathsBeforeWipe, 0);
  const avgDeaths = wipes > 0 ? (totalDeathsBeforeWipe / wipes).toFixed(1) : '-';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[--bg-medium] border border-[--border-color] rounded-xl overflow-hidden"
    >
      <div className="p-4 bg-gradient-to-r from-[--bg-dark] to-[--bg-medium] border-b border-[--border-color]">
        <div className="font-display text-lg font-semibold text-[--accent-gold]">📅 {night.date}</div>
        <div className="text-sm text-[--text-muted]">{night.fights.length} tentatives</div>
      </div>
      
      <div className="p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="font-display text-2xl font-bold text-[--accent-green]">{kills}</div>
          <div className="text-xs text-[--text-muted] uppercase">Kills</div>
        </div>
        <div>
          <div className="font-display text-2xl font-bold text-[--accent-red]">{wipes}</div>
          <div className="text-xs text-[--text-muted] uppercase">Wipes</div>
        </div>
        <div>
          <div className="font-display text-2xl font-bold text-[--accent-orange]">{avgDeaths}</div>
          <div className="text-xs text-[--text-muted] uppercase">Morts moy.</div>
        </div>
      </div>

      <div className="p-4 border-t border-[--border-color] max-h-52 overflow-y-auto">
        {night.fights.map((fight) => (
          <div key={`${fight.reportCode}-${fight.fightId}`} className="flex items-center gap-3 py-2 border-b border-[--border-color] last:border-0">
            <div className={`w-2 h-2 rounded-full ${fight.kill ? 'bg-[--accent-green]' : 'bg-[--accent-red]'}`} />
            <div className="flex-1 text-sm">
              Try #{fight.attemptNumber}
              {fight.fightPercentage && !fight.kill && ` - ${fight.fightPercentage.toFixed(1)}%`}
            </div>
            <div className="text-sm text-[--text-muted]">{formatDuration(fight.durationSeconds)}</div>
            <div className="text-sm text-[--accent-orange]">{fight.deathAnalysis.deathsBeforeWipe} mort(s)</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ComparisonResults({ comparison }: ComparisonResultsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('survival');
  
  const killRate = comparison.totalAttempts > 0
    ? Math.round((comparison.totalKills / comparison.totalAttempts) * 100)
    : 0;

  const failAnalysis = comparison.failAnalysis;

  // Grouper par soirée
  const nightsMap = new Map<string, { date: string; code: string; fights: FightComparison[] }>();
  comparison.comparisons.forEach((comp) => {
    if (!nightsMap.has(comp.reportCode)) {
      nightsMap.set(comp.reportCode, {
        date: comp.reportDate,
        code: comp.reportCode,
        fights: [],
      });
    }
    nightsMap.get(comp.reportCode)!.fights.push(comp);
  });
  const nights = Array.from(nightsMap.values());

  // Extraire les codes de rapports uniques
  const reportCodes = Array.from(new Set(comparison.comparisons.map(c => c.reportCode)));

  const tabs = [
    { id: 'survival' as TabType, label: '⏱️ Temps de survie', icon: '⏱️' },
    { id: 'dps' as TabType, label: '⚡ Analyse DPS', icon: '⚡' },
    { id: 'critical' as TabType, label: '🎯 Morts critiques', icon: '🎯' },
    { id: 'players' as TabType, label: '💀 Hall of Shame', icon: '💀' },
    { id: 'abilities' as TabType, label: '⚔️ Abilities', icon: '⚔️' },
    { id: 'combos' as TabType, label: '🔄 Combos', icon: '🔄' },
    { id: 'overview' as TabType, label: '📊 Vue générale', icon: '📊' },
    { id: 'timeline' as TabType, label: '📅 Soirées', icon: '📅' },
  ];

  return (
    <section className="card p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[--border-color]">
        <div className="flex items-baseline gap-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-3">
            <span>📊</span> Analyse - {comparison.bossName}
          </h2>
          <span className="text-sm text-[--text-muted]">
            {comparison.totalAttempts} tries • {comparison.totalKills} kills • {comparison.totalWipes} wipes
          </span>
        </div>
        <ExportButton comparison={comparison} />
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard value={comparison.totalAttempts} label="Tentatives" color="text-[--accent-gold]" />
        <StatCard value={comparison.totalKills} label="Kills" color="text-[--accent-green]" />
        <StatCard value={comparison.totalWipes} label="Wipes" color="text-[--accent-red]" />
        <StatCard value={`${killRate}%`} label="Taux réussite" color="text-[--accent-purple-light]" />
        <StatCard value={comparison.averageDeathsBeforeWipe.toFixed(1)} label="Morts moy." color="text-[--accent-blue]" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-display text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-[--accent-gold] text-[--bg-darkest]'
                : 'bg-[--bg-medium] text-[--text-secondary] hover:bg-[--bg-card-hover]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'survival' && failAnalysis && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-gold]">
            ⏱️ Temps moyen de survie par joueur
          </h3>
          <p className="text-[--text-muted] mb-4">
            Classement basé sur le temps moyen avant de mourir sur l&apos;ensemble des {comparison.totalAttempts} tentatives analysées.
          </p>
          <SurvivalTable stats={failAnalysis.survivalStats} globalAverage={failAnalysis.globalAverageSurvival} />
        </div>
      )}

      {activeTab === 'dps' && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-purple-light]">
            ⚡ Analyse DPS par période de combat
          </h3>
          <p className="text-[--text-muted] mb-4">
            Compare les DPS sur différentes phases du combat. Utile pour voir qui pop ses CDs à l&apos;opener, qui tient sur la durée, etc.
          </p>
          <DPSAnalysis 
            reportCodes={reportCodes} 
            bossName={comparison.bossName} 
            difficulty={comparison.difficulty} 
          />
        </div>
      )}

      {activeTab === 'critical' && failAnalysis && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-orange]">
            🎯 Tableau des morts critiques (les 3 premières de chaque wipe)
          </h3>
          <p className="text-[--text-muted] mb-4">
            Ces morts sont celles qui comptent vraiment - avant que le wipe soit inévitable.
          </p>
          <CriticalDeathsTable nightsData={failAnalysis.criticalDeathsByNight} />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Phases de mort */}
          {failAnalysis && failAnalysis.deathsByPhase.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-4 text-[--accent-orange]">⏱️ Quand meurent les gens ?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {failAnalysis.deathsByPhase.map((phase) => (
                  <div key={phase.phase} className="bg-[--bg-medium] border border-[--border-color] rounded-lg p-4 text-center">
                    <div className="font-display text-2xl font-bold text-[--accent-red]">{phase.count}</div>
                    <div className="text-sm text-[--text-secondary]">{phase.phase}</div>
                    <div className="text-xs text-[--text-muted] mt-1">{phase.players.length} joueurs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Premiers morts */}
          {failAnalysis && failAnalysis.firstDeaths.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-4 text-[--accent-orange]">⚡ Premiers morts de chaque wipe</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {failAnalysis.firstDeaths.map((fd, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[--bg-medium] border border-[--border-color] rounded-lg border-l-4 border-l-[--accent-orange]">
                    <span className="text-sm text-[--text-muted]">{fd.date} Try #{fd.attempt}</span>
                    <span className="font-semibold text-[--accent-purple-light]">{fd.player}</span>
                    <span className="text-[--text-muted]">tué par</span>
                    <SpellTooltip abilityName={fd.ability}>
                      <span className="text-[--accent-purple-light] hover:text-[--accent-purple] transition-colors cursor-help">
                        {getSpellTranslation(fd.ability).name}
                      </span>
                    </SpellTooltip>
                    <span className="ml-auto text-[--accent-gold] font-mono">{formatDuration(fd.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'players' && failAnalysis && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-red]">💀 Hall of Shame - Qui fail le plus ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {failAnalysis.playerRanking.slice(0, 10).map((player, index) => (
              <PlayerCard key={player.playerName} player={player} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'abilities' && failAnalysis && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-red]">⚔️ Abilities les plus mortelles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {failAnalysis.abilityRanking.slice(0, 10).map((ability, index) => (
              <AbilityCard key={ability.abilityName} ability={ability} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'combos' && failAnalysis && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-purple-light]">🔄 Combos fatals récurrents</h3>
          <p className="text-[--text-muted] mb-4">Quand le même joueur meurt plusieurs fois de la même chose...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {failAnalysis.deadlyCombos.length > 0 ? (
              failAnalysis.deadlyCombos.map((combo, index) => (
                <ComboCard key={`${combo.player}-${combo.ability}`} combo={combo} rank={index + 1} />
              ))
            ) : (
              <p className="text-[--text-muted] col-span-2 text-center py-8">
                Pas de combo récurrent détecté (personne ne meurt 2+ fois de la même chose)
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div>
          <h3 className="font-display text-lg mb-4 text-[--accent-blue]">📅 Progression par soirée</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nights.map((night) => (
              <NightCard key={night.code} night={night} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
