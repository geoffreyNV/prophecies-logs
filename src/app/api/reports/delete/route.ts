import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface DeleteRequest {
  codes: string[]; // Codes des rapports à supprimer
}

/**
 * Route pour supprimer des rapports de la base de données
 * La suppression en cascade supprimera automatiquement :
 * - Les fights associés
 * - Les deaths associés
 * - Les deathAnalysis associés
 */
export async function DELETE(request: Request) {
  // Sur Vercel, SQLite n'est pas disponible
  if (process.env.VERCEL || !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('vercel')) {
    return NextResponse.json(
      { error: 'Base de données non disponible sur Vercel. La suppression de logs nécessite une base de données locale.' },
      { status: 503 }
    );
  }

  try {
    const body: DeleteRequest = await request.json();

    if (!body.codes || !Array.isArray(body.codes) || body.codes.length === 0) {
      return NextResponse.json(
        { error: 'codes est requis et doit être un tableau non vide' },
        { status: 400 }
      );
    }

    console.log(`Suppression de ${body.codes.length} rapport(s): ${body.codes.join(', ')}`);

    // Compter les fights qui seront supprimés
    const reports = await prisma.report.findMany({
      where: { code: { in: body.codes } },
      include: {
        fights: {
          include: {
            deaths: true,
            deathAnalysis: true,
          },
        },
      },
    });

    const totalFights = reports.reduce((sum, r) => sum + r.fights.length, 0);
    const totalDeaths = reports.reduce((sum, r) => 
      sum + r.fights.reduce((fSum, f) => fSum + f.deaths.length, 0), 0
    );

    // Supprimer les rapports (cascade supprimera automatiquement les fights, deaths, etc.)
    const deleteResult = await prisma.report.deleteMany({
      where: { code: { in: body.codes } },
    });

    console.log(`${deleteResult.count} rapport(s) supprimé(s)`);

    return NextResponse.json({
      success: true,
      message: `${deleteResult.count} rapport(s) supprimé(s) (${totalFights} fights, ${totalDeaths} morts)`,
      deleted: deleteResult.count,
      deletedFights: totalFights,
      deletedDeaths: totalDeaths,
    });
  } catch (error) {
    console.error('Error deleting reports:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

