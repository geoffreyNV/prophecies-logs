'use client';

import { useMemo } from 'react';
import { Report, Boss } from '@/types';

interface BossSelectorProps {
  reports: Report[];
  selectedBoss: string;
  onSelectBoss: (boss: string) => void;
  onCompare: () => void;
  isLoading: boolean;
}

function getDifficultyName(difficulty?: number): string {
  const names: Record<number, string> = {
    1: 'LFR',
    2: 'Flex',
    3: 'Normal',
    4: 'Héroïque',
    5: 'Mythique',
  };
  return difficulty ? names[difficulty] || `Diff ${difficulty}` : '';
}

export default function BossSelector({
  reports,
  selectedBoss,
  onSelectBoss,
  onCompare,
  isLoading,
}: BossSelectorProps) {
  const bosses = useMemo(() => {
    const bossMap = new Map<string, Boss>();

    reports.forEach((report) => {
      report.fights.forEach((fight) => {
        const key = `${fight.name}_${fight.difficulty || 0}`;
        if (!bossMap.has(key)) {
          bossMap.set(key, {
            name: fight.name,
            encounterID: fight.encounterID,
            difficulty: fight.difficulty,
            attempts: 0,
            kills: 0,
          });
        }
        const boss = bossMap.get(key)!;
        boss.attempts++;
        if (fight.kill) boss.kills++;
      });
    });

    return Array.from(bossMap.values());
  }, [reports]);

  if (reports.length === 0) return null;

  return (
    <section className="card p-8 animate-fade-in">
      <div className="flex items-baseline gap-4 mb-6 pb-4 border-b border-[--border-color]">
        <h2 className="font-display text-xl font-semibold flex items-center gap-3">
          <span>💀</span> Sélection du Boss
        </h2>
      </div>

      <div className="flex gap-4 items-center">
        <select
          value={selectedBoss}
          onChange={(e) => onSelectBoss(e.target.value)}
          className="flex-1 px-5 py-4 rounded-lg select-dark text-base font-body cursor-pointer"
          disabled={isLoading}
        >
          <option value="">Choisir un boss...</option>
          {bosses.map((boss) => (
            <option key={`${boss.name}_${boss.difficulty || 0}`} value={`${boss.name}_${boss.difficulty || 0}`}>
              {boss.name} {boss.difficulty ? `(${getDifficultyName(boss.difficulty)})` : ''} - {boss.attempts} tentatives
            </option>
          ))}
        </select>

        <button
          onClick={onCompare}
          disabled={!selectedBoss || isLoading}
          className="btn-secondary px-6 py-4 rounded-lg font-display font-semibold uppercase tracking-wide flex items-center gap-2"
        >
          <span>⚡</span>
          Comparer les soirées
        </button>
      </div>
    </section>
  );
}

