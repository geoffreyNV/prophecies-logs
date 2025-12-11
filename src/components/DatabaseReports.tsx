'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Report } from '@/types';

interface DatabaseReportsProps {
  onSelectReports: (reports: Report[]) => void;
  selectedReports: Report[];
}

interface DatabaseReport extends Report {
  fightsCount?: number;
}

export default function DatabaseReports({ onSelectReports, selectedReports }: DatabaseReportsProps) {
  const [reports, setReports] = useState<DatabaseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
    new Set(selectedReports.map(r => r.code))
  );

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/list?limit=100');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des rapports');
      }
      const data = await response.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReport = (report: DatabaseReport) => {
    const newSelectedCodes = new Set(selectedCodes);
    if (newSelectedCodes.has(report.code)) {
      newSelectedCodes.delete(report.code);
    } else {
      newSelectedCodes.add(report.code);
    }
    setSelectedCodes(newSelectedCodes);

    // Mettre à jour les rapports sélectionnés
    const selected = reports.filter(r => newSelectedCodes.has(r.code));
    onSelectReports(selected);
  };

  const selectAll = () => {
    const allCodes = new Set(reports.map(r => r.code));
    setSelectedCodes(allCodes);
    onSelectReports(reports);
  };

  const deselectAll = () => {
    setSelectedCodes(new Set());
    onSelectReports([]);
  };

  const deleteReports = async (codes: string[]) => {
    if (codes.length === 0) {
      alert('Aucun rapport sélectionné');
      return;
    }

    const reportNames = reports
      .filter(r => codes.includes(r.code))
      .map(r => r.title || r.code)
      .join(', ');

    const confirmMessage = codes.length === 1
      ? `Êtes-vous sûr de vouloir supprimer le rapport "${reportNames}" ?\n\nCette action est irréversible et supprimera également tous les fights et morts associés.`
      : `Êtes-vous sûr de vouloir supprimer ${codes.length} rapports ?\n\nCette action est irréversible et supprimera également tous les fights et morts associés.\n\nRapports: ${reportNames}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      const data = await response.json();
      alert(data.message || 'Rapport(s) supprimé(s) avec succès');

      // Retirer les rapports supprimés de la sélection
      const newSelectedCodes = new Set(selectedCodes);
      codes.forEach(code => newSelectedCodes.delete(code));
      setSelectedCodes(newSelectedCodes);

      // Recharger la liste
      await loadReports();

      // Mettre à jour les rapports sélectionnés
      const remainingSelected = reports
        .filter(r => newSelectedCodes.has(r.code) && !codes.includes(r.code));
      onSelectReports(remainingSelected);
    } catch (err) {
      console.error('Error deleting reports:', err);
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-[--text-muted]">Chargement des rapports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8">
        <div className="text-[--accent-red] mb-4">❌ Erreur: {error}</div>
        <button onClick={loadReports} className="btn-secondary">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-2">
            📚 Rapports en Base de Données
          </h2>
          <p className="text-sm text-[--text-muted]">
            {total} rapport{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} • {selectedCodes.size} sélectionné{selectedCodes.size > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-[--bg-medium] hover:bg-[--bg-card-hover] rounded-lg text-sm transition-colors"
          >
            Tout sélectionner
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 bg-[--bg-medium] hover:bg-[--bg-card-hover] rounded-lg text-sm transition-colors"
          >
            Tout désélectionner
          </button>
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-[--bg-medium] hover:bg-[--bg-card-hover] rounded-lg text-sm transition-colors"
          >
            🔄 Actualiser
          </button>
          {selectedCodes.size > 0 && (
            <button
              onClick={() => deleteReports(Array.from(selectedCodes))}
              className="px-4 py-2 bg-[--accent-red]/20 hover:bg-[--accent-red]/30 text-[--accent-red] rounded-lg text-sm transition-colors font-semibold"
              title={`Supprimer ${selectedCodes.size} rapport(s) sélectionné(s)`}
            >
              🗑️ Supprimer ({selectedCodes.size})
            </button>
          )}
          <button
            onClick={async () => {
              if (confirm('Réimporter les fights manquants pour tous les rapports ?')) {
                setIsLoading(true);
                try {
                  const response = await fetch('/api/reports/fix-fights', { method: 'POST' });
                  const data = await response.json();
                  alert(data.message || 'Fights réimportés');
                  loadReports();
                } catch (err) {
                  alert('Erreur lors de la réimportation');
                } finally {
                  setIsLoading(false);
                }
              }
            }}
            className="px-4 py-2 bg-[--accent-orange]/20 hover:bg-[--accent-orange]/30 text-[--accent-orange] rounded-lg text-sm transition-colors"
            title="Réimporter les fights manquants"
          >
            🔧 Réparer
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg text-[--text-muted] mb-2">Aucun rapport en base de données</p>
          <p className="text-sm text-[--text-muted]">
            Utilise le bouton d&apos;import pour ajouter des rapports
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, index) => {
            const isSelected = selectedCodes.has(report.code);
            return (
              <motion.div
                key={report.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => toggleReport(report)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[--accent-gold] bg-[--accent-gold]/10'
                    : 'border-[--border-color] bg-[--bg-medium] hover:border-[--accent-purple] hover:bg-[--bg-card-hover]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold text-[--accent-gold] mb-1">
                      {report.code}
                    </div>
                    <div className="text-sm font-semibold text-[--text-primary] line-clamp-2">
                      {report.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {isSelected && (
                      <div className="text-2xl">✅</div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReports([report.code]);
                      }}
                      className="px-2 py-1 bg-[--accent-red]/20 hover:bg-[--accent-red]/30 text-[--accent-red] rounded text-xs transition-colors"
                      title="Supprimer ce rapport"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs text-[--text-muted] mt-3">
                  <div>📅 {formatDate(report.startTime)}</div>
                  {report.zoneName && (
                    <div>🗺️ {report.zoneName}</div>
                  )}
                  {report.owner && (
                    <div>👤 {report.owner}</div>
                  )}
                  <div>⚔️ {report.fightsCount || report.fights?.length || 0} combat{(report.fightsCount || report.fights?.length || 0) > 1 ? 's' : ''}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

