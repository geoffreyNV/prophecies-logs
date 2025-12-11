import { NextResponse } from 'next/server';
import { getCachedReport } from '@/lib/report-cache';
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
    
    const cachedReport = await getCachedReport(code);
    
    // Convertir le format Prisma au format attendu
    const report: ReportData = {
      code: cachedReport.code,
      title: cachedReport.title,
      startTime: Number(cachedReport.startTime),
      endTime: Number(cachedReport.endTime),
      zone: cachedReport.zoneName ? { name: cachedReport.zoneName } : undefined,
      owner: cachedReport.owner ? { name: cachedReport.owner } : undefined,
      fights: cachedReport.fights.map(f => ({
        id: f.fightId,
        name: f.name,
        encounterID: f.encounterId,
        startTime: Number(f.startTime),
        endTime: Number(f.endTime),
        kill: f.kill,
        difficulty: f.difficulty || undefined,
        fightPercentage: f.fightPercentage || undefined,
        lastPhase: f.lastPhase || undefined,
      })),
    };

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

