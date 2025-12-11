import { NextResponse } from 'next/server';
import { importAndAnalyzeGuildReports } from '@/lib/guild-import';

interface ImportRequest {
  guildName: string;
  serverSlug: string;
  serverRegion?: string;
  monthsBack?: number;
}

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();

    if (!body.guildName || !body.serverSlug) {
      return NextResponse.json(
        { error: 'guildName et serverSlug sont requis' },
        { status: 400 }
      );
    }

    const guildName = body.guildName;
    const serverSlug = body.serverSlug;
    const serverRegion = body.serverRegion || 'EU';
    const monthsBack = body.monthsBack || 3;

    console.log(`Début de l'import pour ${guildName} sur ${serverSlug} (${monthsBack} mois)`);

    const result = await importAndAnalyzeGuildReports(
      guildName,
      serverSlug,
      serverRegion,
      monthsBack
    );

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${result.imported} rapports importés, ${result.analyzed} fights analysés`,
      result,
    });
  } catch (error) {
    console.error('Error importing guild reports:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Route GET pour déclencher l'import de Prophecies
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get('months') || '3');

    console.log('Import automatique des logs de Prophecies (Hyjal)');

    const result = await importAndAnalyzeGuildReports(
      'Prophecies',
      'hyjal',
      'EU',
      monthsBack
    );

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${result.imported} rapports importés, ${result.analyzed} fights analysés`,
      result,
    });
  } catch (error) {
    console.error('Error importing Prophecies reports:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

