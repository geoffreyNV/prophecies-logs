'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LoadingOverlay from '@/components/LoadingOverlay';

interface KillReport {
  code: string;
  startTime: number;
  fightID: number;
  server: string;
  serverSlug: string;
  region: string;
  guild: string | null;
  players: string[];
  rank: number;
  duration: number;
}

interface SearchResult {
  encounter: {
    id: number;
    name: string;
  };
  difficulty: number;
  region: string;
  totalFound: number;
  reports: KillReport[];
  error?: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function KillsPage() {
  // Nexus-King Salhadaar - Manaforge Omega
  const [zoneID, setZoneID] = useState('44'); // Manaforge Omega
  const [encounterID, setEncounterID] = useState('3134'); // Nexus-King Salhadaar
  const [difficulty, setDifficulty] = useState('5'); // 5 = Mythique
  const [serverRegion] = useState('EU'); // Toujours Europe
  const [selectedServer, setSelectedServer] = useState<string>('all'); // Tous les serveurs par défaut
  const [servers, setServers] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  
  // Charger les serveurs au montage
  useEffect(() => {
    const loadServers = async () => {
      setIsLoadingServers(true);
      try {
        const response = await fetch(`/api/servers?region=${serverRegion}`);
        if (response.ok) {
          const data = await response.json();
          setServers(data.servers || []);
        }
      } catch (err) {
        console.error('Error loading servers:', err);
      } finally {
        setIsLoadingServers(false);
      }
    };
    loadServers();
  }, [serverRegion]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setSelectedReports(new Set());

    try {
      const response = await fetch('/api/zone-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneID: parseInt(zoneID),
          encounterID: parseInt(encounterID),
          difficulty: parseInt(difficulty),
          serverRegion: serverRegion,
          serverSlug: selectedServer !== 'all' ? selectedServer : undefined,
          limit: 100, // Toujours 100 logs aléatoires
          killsOnly: true, // Seulement les kills
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la recherche');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedReports.size === 0) {
      alert('Sélectionne au moins un rapport à exporter');
      return;
    }

    setIsExporting(true);

    try {
      const reportsToExport = Array.from(selectedReports);
      const allData: Record<string, unknown> = {};

      for (const reportCode of reportsToExport) {
        try {
          const response = await fetch('/api/raw-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reportCode,
              includeEvents: true,
              includeTable: true,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            allData[reportCode] = data;
          }
        } catch (err) {
          console.error(`Error exporting ${reportCode}:`, err);
        }
      }

      // Créer le fichier JSON
      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `nexus-king-kills-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de l\'export');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleReport = (code: string) => {
    const newSet = new Set(selectedReports);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedReports(newSet);
  };

  const selectAll = () => {
    if (results) {
      setSelectedReports(new Set(results.reports.map(r => r.code)));
    }
  };

  const deselectAll = () => {
    setSelectedReports(new Set());
  };

  return (
    <>
      <div className="app-background" />
      <div className="app-overlay" />
      
      {isLoading && <LoadingOverlay text="Recherche des kills..." />}
      {isExporting && <LoadingOverlay text="Export des logs bruts..." />}

      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="card p-8">
          <h1 className="font-display text-3xl font-bold mb-2 gradient-gold">
            🔍 Recherche de Kills - Nexus-King Salhadaar
          </h1>
          <p className="text-[--text-muted] mb-6">
            Liste <span className="text-[--accent-gold] font-semibold">100 logs aléatoires européens</span> qui ont tué Nexus-King Salhadaar (Manaforge Omega) et exporte-les en JSON brut.
            <br />
            <span className="text-xs">
              Zone ID: 44 (Manaforge Omega) • Boss ID: 3134 (Nexus-King Salhadaar) • Région: Europe uniquement
            </span>
          </p>

          {/* Paramètres de recherche */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-2">
                  Zone ID
                </label>
                <input
                  type="text"
                  value={zoneID}
                  onChange={(e) => setZoneID(e.target.value)}
                  placeholder="44"
                  className="w-full px-4 py-3 rounded-lg input-dark"
                />
                <p className="text-xs text-[--text-muted] mt-1">
                  Manaforge Omega = 44
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-2">
                  Encounter ID
                </label>
                <input
                  type="text"
                  value={encounterID}
                  onChange={(e) => setEncounterID(e.target.value)}
                  placeholder="3134"
                  className="w-full px-4 py-3 rounded-lg input-dark"
                />
                <p className="text-xs text-[--text-muted] mt-1">
                  Nexus-King Salhadaar = 3134
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-2">
                  Difficulté
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg select-dark"
                >
                  <option value="1">LFR</option>
                  <option value="2">Flex</option>
                  <option value="3">Normal</option>
                  <option value="4">Héroïque</option>
                  <option value="5">Mythique</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full btn-primary px-6 py-3 rounded-lg font-display font-semibold disabled:opacity-50"
                >
                  🔍 Rechercher
                </button>
              </div>
            </div>
            
            {/* Filtre serveur */}
            <div>
              <label className="block text-sm font-medium text-[--text-secondary] mb-2">
                🌍 Filtrer par serveur (optionnel)
              </label>
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                disabled={isLoadingServers}
                className="w-full px-4 py-3 rounded-lg select-dark"
              >
                <option value="all">Tous les serveurs européens</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.slug}>
                    {server.name}
                  </option>
                ))}
              </select>
              {isLoadingServers && (
                <p className="text-xs text-[--text-muted] mt-1">Chargement des serveurs...</p>
              )}
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-red-400 mb-6">
              {error}
        </div>
          )}

          {/* Résultats */}
          {results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {results.encounter.name} - {results.totalFound} kills européens (aléatoires)
                  </h2>
                  <p className="text-sm text-[--text-muted]">
                    🌍 Région: {results.region} • ⚔️ Difficulté: {difficulty === '5' ? 'Mythique' : difficulty} • 🎲 Sélection aléatoire
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-4 py-2 rounded-lg bg-[--bg-medium] border border-[--border-color] hover:bg-[--bg-card-hover] transition-colors text-sm"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-4 py-2 rounded-lg bg-[--bg-medium] border border-[--border-color] hover:bg-[--bg-card-hover] transition-colors text-sm"
                  >
                    Tout désélectionner
                  </button>
                  <button
                    onClick={handleExportSelected}
                    disabled={selectedReports.size === 0 || isExporting}
                    className="px-4 py-2 rounded-lg btn-primary font-display font-semibold text-sm disabled:opacity-50"
                  >
                    📥 Exporter ({selectedReports.size})
                  </button>
                </div>
              </div>

              {results.error && (
                <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 text-yellow-400">
                  ⚠️ {results.error}
                </div>
              )}

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {results.reports.map((report) => (
                  <div
                    key={report.code}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedReports.has(report.code)
                        ? 'bg-[--accent-gold]/20 border-[--accent-gold]'
                        : 'bg-[--bg-medium] border-[--border-color] hover:bg-[--bg-card-hover]'
                    }`}
                    onClick={() => toggleReport(report.code)}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.code)}
                        onChange={() => toggleReport(report.code)}
                        className="mt-1 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-sm text-[--accent-gold] font-semibold">{report.code}</span>
                    <span className="text-sm text-[--text-muted]">
                      📅 {formatDate(report.startTime)}
                    </span>
                    {report.guild ? (
                      <span className="px-3 py-1 bg-[--accent-purple]/20 rounded-lg text-sm font-semibold text-[--accent-purple-light] border border-[--accent-purple]/50">
                        🏰 {report.guild}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-[--bg-dark] rounded-lg text-sm text-[--text-muted] border border-[--border-color]">
                        🏰 Personal Logs
                      </span>
                    )}
                    <span className="px-2 py-1 bg-[--bg-dark] rounded text-sm border border-[--accent-blue]/30">
                      🌍 {report.server}
                    </span>
                    <span className="px-2 py-1 bg-[--accent-green]/20 rounded text-sm text-[--accent-green] border border-[--accent-green]/30">
                      ✅ KILL
                    </span>
                  </div>
                  <div className="text-sm text-[--text-secondary] space-y-1">
                    <div>
                      <span className="text-[--accent-purple-light] font-semibold">
                        {report.players && report.players.length > 0 ? `${report.players.length} joueurs` : 'N/A'}
                      </span>
                      {' • '}
                      <span>⏱️ Durée: {formatDuration(report.duration)}</span>
                      {' • '}
                      <span className="text-[--accent-gold]">🏆 Rank: #{report.rank}</span>
                    </div>
                    {report.players && report.players.length > 0 && (
                      <div className="text-xs text-[--text-muted] mt-1">
                        Joueurs: {report.players.slice(0, 5).join(', ')}
                        {report.players.length > 5 && ` + ${report.players.length - 5} autres`}
                      </div>
                    )}
                  </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

