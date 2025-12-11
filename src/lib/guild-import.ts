import { prisma } from './db';
import { getCachedReport, getCachedDeathAnalysis } from './report-cache';
import { queryWarcraftLogs } from './warcraftlogs';

interface GuildReport {
  code: string;
  startTime: number;
  zone?: {
    id: number;
    name: string;
  };
}

/**
 * Récupère les rapports d'une guilde depuis WarcraftLogs
 */
export async function fetchGuildReports(
  guildName: string,
  serverSlug: string,
  serverRegion: string = 'EU',
  startDate?: number, // Timestamp en millisecondes
  endDate?: number
): Promise<GuildReport[]> {
  // L'API WarcraftLogs v2 - structure correcte pour guildData.attendance
  const query = `
    query GetGuildReports($guildName: String!, $serverSlug: String!, $serverRegion: String!) {
      guildData {
        guild(name: $guildName, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          id
          name
          server {
            name
            slug
            region {
              name
              slug
            }
          }
          attendance {
            data {
              code
              startTime
              zone {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryWarcraftLogs(query, {
      guildName,
      serverSlug,
      serverRegion,
    }) as {
      guildData: {
        guild: {
          attendance: {
            data: GuildReport[];
          };
        } | null;
      };
    } | null;

    if (!data?.guildData?.guild) {
      console.log(`Guilde ${guildName} non trouvée sur ${serverSlug} (${serverRegion})`);
      return [];
    }

    if (!data.guildData.guild.attendance?.data) {
      console.log(`Aucun rapport trouvé pour la guilde ${guildName} sur ${serverSlug}`);
      return [];
    }

    let reports = data.guildData.guild.attendance.data;

    // Filtrer par date si fourni
    if (startDate) {
      reports = reports.filter(r => r.startTime >= startDate);
    }
    if (endDate) {
      reports = reports.filter(r => r.startTime <= endDate);
    }

    // Trier par date décroissante (plus récent en premier)
    reports.sort((a, b) => b.startTime - a.startTime);

    return reports;
  } catch (error) {
    console.error('Error fetching guild reports:', error);
    // Si l'API ne fonctionne pas, retourner un tableau vide
    return [];
  }
}

/**
 * Importe les rapports d'une guilde dans la base de données
 * Gère automatiquement les doublons grâce aux contraintes uniques
 */
export async function importGuildReports(
  guildName: string,
  serverSlug: string,
  serverRegion: string = 'EU',
  monthsBack: number = 3
): Promise<{ imported: number; skipped: number; errors: number }> {
  const now = Date.now();
  const startDate = now - (monthsBack * 30 * 24 * 60 * 60 * 1000); // 3 mois en millisecondes

  console.log(`Import des rapports de ${guildName} sur ${serverSlug} (${serverRegion})`);
  console.log(`Période: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(now).toLocaleDateString('fr-FR')}`);

  // Récupérer les rapports depuis l'API
  const reports = await fetchGuildReports(guildName, serverSlug, serverRegion, startDate, now);

  if (reports.length === 0) {
    console.log('Aucun rapport à importer');
    return { imported: 0, skipped: 0, errors: 0 };
  }

  console.log(`${reports.length} rapports trouvés, import en cours...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Importer chaque rapport
  for (const report of reports) {
    try {
      // Vérifier si le rapport existe déjà (éviter les doublons)
      const existing = await prisma.report.findUnique({
        where: { code: report.code },
      });

      if (existing) {
        console.log(`[Skip] Rapport ${report.code} déjà présent en base`);
        skipped++;
        continue;
      }

      // Importer le rapport (getCachedReport gère déjà les doublons)
      await getCachedReport(report.code);
      console.log(`[Import] Rapport ${report.code} importé`);
      imported++;
    } catch (error) {
      console.error(`[Error] Erreur lors de l'import du rapport ${report.code}:`, error);
      errors++;
    }
  }

  console.log(`Import terminé: ${imported} importés, ${skipped} déjà présents, ${errors} erreurs`);

  return { imported, skipped, errors };
}

/**
 * Importe et analyse complètement les rapports d'une guilde
 * (rapports + analyses des morts)
 */
export async function importAndAnalyzeGuildReports(
  guildName: string,
  serverSlug: string,
  serverRegion: string = 'EU',
  monthsBack: number = 3
): Promise<{ imported: number; analyzed: number; skipped: number; errors: number }> {
  const importResult = await importGuildReports(guildName, serverSlug, serverRegion, monthsBack);

  // Récupérer tous les fights des rapports importés
  const reports = await prisma.report.findMany({
    where: {
      startTime: {
        gte: BigInt(Date.now() - (monthsBack * 30 * 24 * 60 * 60 * 1000)),
      },
    },
    include: {
      fights: true,
    },
    orderBy: {
      startTime: 'desc',
    },
  });

  let analyzed = 0;
  let analysisErrors = 0;

  // Analyser chaque fight
  for (const report of reports) {
    for (const fight of report.fights) {
      try {
        // Vérifier si l'analyse existe déjà
        const existingAnalysis = await prisma.deathAnalysis.findUnique({
          where: { fightId: fight.id },
        });

        if (existingAnalysis) {
          continue; // Déjà analysé
        }

        // Analyser le fight
        await getCachedDeathAnalysis(report.code, fight.fightId);
        analyzed++;
      } catch (error) {
        console.error(`[Error] Erreur lors de l'analyse du fight ${fight.fightId}:`, error);
        analysisErrors++;
      }
    }
  }

  return {
    imported: importResult.imported,
    analyzed,
    skipped: importResult.skipped,
    errors: importResult.errors + analysisErrors,
  };
}

