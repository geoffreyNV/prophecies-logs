import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getReport } from '@/lib/warcraftlogs';

/**
 * Route pour réimporter les fights manquants des rapports existants
 */
export async function POST(request: Request) {
  try {
    // Récupérer tous les rapports sans fights
    const reportsWithoutFights = await prisma.report.findMany({
      include: {
        fights: true,
      },
    });

    const reportsToFix = reportsWithoutFights.filter(r => r.fights.length === 0);

    if (reportsToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tous les rapports ont déjà leurs fights',
        fixed: 0,
      });
    }

    console.log(`${reportsToFix.length} rapports sans fights à corriger`);

    let fixed = 0;
    let fixedFights = 0;
    let errors = 0;

    for (const report of reportsToFix) {
      try {
        // Récupérer les données complètes depuis l'API (forcer la récupération)
        const reportData = await getReport(report.code) as {
          code: string;
          title: string;
          startTime: number;
          endTime: number;
          zone?: { id: number; name: string };
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
        };

        if (!reportData || !reportData.fights) {
          console.log(`[Skip] Aucun fight trouvé pour ${report.code}`);
          continue;
        }

        // Sauvegarder les fights
        for (const fight of reportData.fights) {
          await prisma.fight.upsert({
            where: {
              reportId_fightId: {
                reportId: report.id,
                fightId: fight.id,
              },
            },
            update: {
              name: fight.name,
              encounterId: fight.encounterID,
              startTime: BigInt(fight.startTime),
              endTime: BigInt(fight.endTime),
              kill: fight.kill,
              difficulty: fight.difficulty,
              fightPercentage: fight.fightPercentage,
              lastPhase: fight.lastPhase,
              updatedAt: new Date(),
            },
            create: {
              reportId: report.id,
              fightId: fight.id,
              name: fight.name,
              encounterId: fight.encounterID,
              startTime: BigInt(fight.startTime),
              endTime: BigInt(fight.endTime),
              kill: fight.kill,
              difficulty: fight.difficulty,
              fightPercentage: fight.fightPercentage,
              lastPhase: fight.lastPhase,
            },
          });
          fixedFights++;
        }

        fixed++;
        console.log(`[Fix] ${reportData.fights.length} fights réimportés pour ${report.code}`);
      } catch (error) {
        console.error(`[Error] Erreur lors de la réimportation de ${report.code}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${fixed} rapports corrigés, ${fixedFights} fights ajoutés, ${errors} erreurs`,
      fixedReports: fixed,
      fixedFights,
      errors,
      total: reportsToFix.length,
    });
  } catch (error) {
    console.error('Error fixing fights:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

