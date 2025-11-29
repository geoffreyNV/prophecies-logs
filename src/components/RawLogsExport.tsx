'use client';

import { useState } from 'react';
import { Report } from '@/types';

interface RawLogsExportProps {
  reports: Report[];
}

export default function RawLogsExport({ reports }: RawLogsExportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [selectedFights, setSelectedFights] = useState<number[]>([]);

  const handleExport = async () => {
    if (!selectedReport) {
      setError('Veuillez sélectionner un rapport');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/raw-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportCode: selectedReport,
          fightIds: selectedFights.length > 0 ? selectedFights : undefined,
          includeEvents,
          includeTable,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'export');
      }

      const rawData = await response.json();

      // Créer le fichier JSON
      const blob = new Blob([JSON.stringify(rawData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const report = reports.find(r => r.code === selectedReport);
      const date = new Date().toISOString().split('T')[0];
      a.download = `warcraftlogs-raw-${selectedReport}-${date}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedReportData = reports.find(r => r.code === selectedReport);

  return (
    <div className="bg-[--bg-medium] border border-[--border-color] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📦</span>
        <h3 className="font-display text-lg font-semibold">Export des logs bruts WarcraftLogs</h3>
      </div>
      <p className="text-sm text-[--text-muted]">
        Exporte les données brutes telles que l&apos;API WarcraftLogs les renvoie (format JSON complet).
      </p>

      {/* Sélection du rapport */}
      <div>
        <label className="block text-sm font-medium text-[--text-secondary] mb-2">
          Rapport à exporter
        </label>
        <select
          value={selectedReport}
          onChange={(e) => {
            setSelectedReport(e.target.value);
            setSelectedFights([]);
          }}
          className="w-full px-4 py-3 rounded-lg select-dark"
        >
          <option value="">Choisir un rapport...</option>
          {reports.map((report) => (
            <option key={report.code} value={report.code}>
              {report.title} ({report.date}) - {report.fights.length} fights
            </option>
          ))}
        </select>
      </div>

      {/* Sélection des fights (optionnel) */}
      {selectedReportData && selectedReportData.fights.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[--text-secondary] mb-2">
            Fights à exporter (optionnel - laisser vide pour tout exporter)
          </label>
          <div className="max-h-40 overflow-y-auto border border-[--border-color] rounded-lg p-2 bg-[--bg-dark]">
            {selectedReportData.fights.map((fight) => (
              <label
                key={fight.id}
                className="flex items-center gap-2 p-2 hover:bg-[--bg-medium] rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedFights.includes(fight.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFights([...selectedFights, fight.id]);
                    } else {
                      setSelectedFights(selectedFights.filter(id => id !== fight.id));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">
                  {fight.name} {fight.kill ? '✅' : '❌'} - Try #{fight.id}
                </span>
              </label>
            ))}
          </div>
          {selectedFights.length > 0 && (
            <button
              onClick={() => setSelectedFights([])}
              className="mt-2 text-sm text-[--accent-red] hover:underline"
            >
              Tout désélectionner
            </button>
          )}
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeEvents}
            onChange={(e) => setIncludeEvents(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">
            Inclure les events bruts (tous les événements du combat)
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeTable}
            onChange={(e) => setIncludeTable(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">
            Inclure les tables (summary, playerDetails, etc.)
          </span>
        </label>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bouton d'export */}
      <button
        onClick={handleExport}
        disabled={!selectedReport || isLoading}
        className="w-full btn-primary px-6 py-3 rounded-lg font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="loading-spinner w-5 h-5" />
            <span>Export en cours...</span>
          </>
        ) : (
          <>
            <span>📥</span>
            <span>Exporter les logs bruts</span>
          </>
        )}
      </button>

      <p className="text-xs text-[--text-muted] text-center">
        ⚠️ Les fichiers peuvent être volumineux selon le nombre de fights et events
      </p>
    </div>
  );
}

