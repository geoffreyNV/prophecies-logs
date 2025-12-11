'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ImportResult {
  success: boolean;
  message: string;
  result: {
    imported: number;
    analyzed: number;
    skipped: number;
    errors: number;
  };
}

export default function GuildImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/guild/import?months=3');
      const data: ImportResult = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'import');
      }

      setResult(data);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold mb-1">
            📥 Import des Logs de Guilde
          </h3>
          <p className="text-sm text-[--text-muted]">
            Importe automatiquement les 3 derniers mois de logs de <span className="text-[--accent-gold] font-semibold">Prophecies</span> sur <span className="text-[--accent-purple-light] font-semibold">Hyjal (EU)</span>
          </p>
        </div>
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="btn-primary px-6 py-3 rounded-lg font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isImporting ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Import en cours...</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Importer les logs</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[--accent-red]/20 border border-[--accent-red] rounded-lg mb-4"
        >
          <div className="flex items-center gap-2 text-[--accent-red]">
            <span>❌</span>
            <span className="font-semibold">Erreur</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[--accent-green]/20 border border-[--accent-green] rounded-lg"
        >
          <div className="flex items-center gap-2 text-[--accent-green] mb-3">
            <span>✅</span>
            <span className="font-semibold">Import terminé</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[--bg-dark] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[--accent-green]">
                {result.result.imported}
              </div>
              <div className="text-xs text-[--text-muted] mt-1">
                Rapports importés
              </div>
            </div>
            
            <div className="bg-[--bg-dark] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[--accent-blue]">
                {result.result.analyzed}
              </div>
              <div className="text-xs text-[--text-muted] mt-1">
                Combats analysés
              </div>
            </div>
            
            <div className="bg-[--bg-dark] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[--accent-orange]">
                {result.result.skipped}
              </div>
              <div className="text-xs text-[--text-muted] mt-1">
                Déjà présents
              </div>
            </div>
            
            {result.result.errors > 0 && (
              <div className="bg-[--bg-dark] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[--accent-red]">
                  {result.result.errors}
                </div>
                <div className="text-xs text-[--text-muted] mt-1">
                  Erreurs
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[--border-color]">
            <p className="text-xs text-[--text-muted]">
              <span className="font-semibold">Protection doublons :</span> Les rapports déjà présents en base sont automatiquement ignorés grâce aux contraintes uniques.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

