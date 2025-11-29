'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Report } from '@/types';

interface ReportInputProps {
  reports: Report[];
  onAddReport: (report: Report) => void;
  onRemoveReport: (code: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function ReportInput({
  reports,
  onAddReport,
  onRemoveReport,
  isLoading,
  setIsLoading,
}: ReportInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAddReport = async () => {
    const code = inputValue.trim();
    
    if (!code) {
      setError('Veuillez entrer un code de rapport');
      return;
    }

    if (reports.length >= 4) {
      setError('Maximum 4 rapports peuvent être comparés');
      return;
    }

    if (reports.some((r) => r.code === code)) {
      setError('Ce rapport a déjà été ajouté');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/report/${code}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la récupération');
      }

      const report = await response.json();
      onAddReport(report);
      setInputValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddReport();
    }
  };

  return (
    <section className="card p-8">
      <div className="flex items-baseline gap-4 mb-6 pb-4 border-b border-[--border-color]">
        <h2 className="font-display text-xl font-semibold flex items-center gap-3">
          <span>📜</span> Rapports à comparer
        </h2>
        <span className="text-sm text-[--text-muted]">
          Ajoutez jusqu&apos;à 4 rapports WarcraftLogs
        </span>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Code du rapport (ex: abc123xyz)"
          className="flex-1 px-5 py-4 rounded-lg input-dark text-base font-body"
          disabled={isLoading}
        />
        <button
          onClick={handleAddReport}
          disabled={isLoading}
          className="btn-primary px-6 py-4 rounded-lg font-display font-semibold uppercase tracking-wide flex items-center gap-2 disabled:opacity-50"
        >
          <span className="text-xl">+</span>
          Ajouter
        </button>
      </div>

      {error && (
        <p className="text-[--accent-red] mb-4 text-sm">{error}</p>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {reports.map((report, index) => (
            <motion.div
              key={report.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 p-4 bg-[--bg-medium] border border-[--border-color] rounded-xl card-hover transition-all"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-[--accent-gold] text-[--bg-darkest] rounded-full font-display font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium">{report.title}</div>
                <div className="text-sm text-[--text-muted]">
                  <span>📅 {report.date}</span>
                  {report.zoneName && (
                    <span className="text-[--accent-purple-light]"> • 🏰 {report.zoneName}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemoveReport(report.code)}
                className="px-3 py-2 bg-[--accent-red] text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

