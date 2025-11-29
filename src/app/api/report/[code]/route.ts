import { NextResponse } from 'next/server';
import { getReport } from '@/lib/warcraftlogs';
import { Report, Fight } from '@/types';

interface ReportData {
  code: string;
  title: string;
  startTime: number;
  zone?: { name: string };
  owner?: { name: string };
  fights: Array<{
    id: number;
    name: string;
    encounterID: number;
    startTime: number;
    endTime: number;
    kill: boolean;
    difficulty?: number;
    fightPercentage?: number;
    lastPhase?: number;
  }>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    console.log('Fetching report:', code);
    
    const report = await getReport(code) as ReportData | null;

    if (!report) {
      return NextResponse.json(
        { error: 'Rapport non trouvé. Vérifiez le code du rapport.' },
        { status: 404 }
      );
    }

    const fights: Fight[] = (report.fights || []).map((f) => ({
      id: f.id,
      name: f.name,
      encounterID: f.encounterID,
      startTime: f.startTime,
      endTime: f.endTime,
      kill: f.kill,
      difficulty: f.difficulty,
      fightPercentage: f.fightPercentage,
      lastPhase: f.lastPhase,
    }));

    const date = new Date(report.startTime).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const response: Report = {
      code: report.code,
      title: report.title || 'Sans titre',
      date,
      zoneName: report.zone?.name,
      owner: report.owner?.name,
      fights,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching report:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

