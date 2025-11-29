import { NextResponse } from 'next/server';
import { compareBossAcrossReports } from '@/lib/analysis';

interface CompareRequest {
  reportCodes: string[];
  bossName: string;
  difficulty?: number;
}

export async function POST(request: Request) {
  try {
    const body: CompareRequest = await request.json();

    if (!body.reportCodes || body.reportCodes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins 1 rapport est requis' },
        { status: 400 }
      );
    }

    if (body.reportCodes.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 rapports peuvent être comparés' },
        { status: 400 }
      );
    }

    if (!body.bossName) {
      return NextResponse.json(
        { error: 'Le nom du boss est requis' },
        { status: 400 }
      );
    }

    const comparison = await compareBossAcrossReports(
      body.reportCodes,
      body.bossName,
      body.difficulty
    );

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing raids:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la comparaison' },
      { status: 500 }
    );
  }
}

