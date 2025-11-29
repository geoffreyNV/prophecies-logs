'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ReportInput from '@/components/ReportInput';
import BossSelector from '@/components/BossSelector';
import ComparisonResults from '@/components/ComparisonResults';
import LoadingOverlay from '@/components/LoadingOverlay';
import RawLogsExport from '@/components/RawLogsExport';
import { Report, BossComparison } from '@/types';

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedBoss, setSelectedBoss] = useState('');
  const [comparison, setComparison] = useState<BossComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Chargement...');

  const handleAddReport = (report: Report) => {
    setReports([...reports, report]);
    setComparison(null);
  };

  const handleRemoveReport = (code: string) => {
    setReports(reports.filter((r) => r.code !== code));
    setComparison(null);
  };

  const handleCompare = async () => {
    if (!selectedBoss || reports.length === 0) return;

    const [bossName, diffStr] = selectedBoss.split('_');
    const difficulty = diffStr !== '0' ? parseInt(diffStr) : undefined;

    setIsLoading(true);
    setLoadingText('Analyse des soirées de raid...');

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportCodes: reports.map((r) => r.code),
          bossName,
          difficulty,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la comparaison');
      }

      const result = await response.json();
      setComparison(result);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="app-background" />
      <div className="app-overlay" />
      
      {isLoading && <LoadingOverlay text={loadingText} />}

      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <ReportInput
          reports={reports}
          onAddReport={handleAddReport}
          onRemoveReport={handleRemoveReport}
          isLoading={isLoading}
          setIsLoading={(loading) => {
            setIsLoading(loading);
            setLoadingText('Récupération du rapport...');
          }}
        />

        {reports.length > 0 && (
          <RawLogsExport reports={reports} />
        )}

        <BossSelector
          reports={reports}
          selectedBoss={selectedBoss}
          onSelectBoss={setSelectedBoss}
          onCompare={handleCompare}
          isLoading={isLoading}
        />

        {comparison && <ComparisonResults comparison={comparison} />}
      </main>

      <footer className="py-8 px-4 text-center border-t border-[--border-color] mt-8">
        <p className="text-sm text-[--text-muted]">
          Prophecies Raid Analyzer • Données fournies par{' '}
          <a
            href="https://www.warcraftlogs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[--accent-purple-light] hover:text-[--accent-gold] transition-colors"
          >
            WarcraftLogs
          </a>
        </p>
      </footer>
    </>
  );
}

