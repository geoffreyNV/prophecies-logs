import { NextResponse } from 'next/server';
import { queryWarcraftLogs } from '@/lib/warcraftlogs';

interface SearchKillsRequest {
  encounterID: number;
  difficulty?: number;
  serverRegion?: string;
  serverSlug?: string;
  limit?: number;
}

export async function POST(request: Request) {
  try {
    const body: SearchKillsRequest = await request.json();

    if (!body.encounterID) {
      return NextResponse.json(
        { error: 'L\'ID de l\'encounter est requis' },
        { status: 400 }
      );
    }

    const difficulty = body.difficulty || 5; // Mythique par défaut
    const serverRegion = body.serverRegion || 'EU';
    const limit = body.limit || 50;

    console.log(`Searching kills for encounter ${body.encounterID}, difficulty ${difficulty}, region ${serverRegion}`);

    // Requête pour rechercher les kills dans le monde
    const query = `
      query SearchKills($encounterID: Int!, $difficulty: Int!, $serverRegion: String!, $limit: Int!) {
        worldData {
          encounter(id: $encounterID) {
            id
            name
          }
        }
        rateLimitData {
          limitPerHour
          pointsSpentThisHour
          pointsResetIn
        }
      }
    `;

    // Note: L'API WarcraftLogs v2 n'a pas de query directe pour rechercher les kills par encounter
    // On va utiliser une approche différente : rechercher via les guildes ou utiliser les rankings
    
    // Alternative : Utiliser la query pour les rankings de guilde
    const rankingsQuery = `
      query GetGuildRankings($encounterID: Int!, $difficulty: Int!, $serverRegion: String!) {
        worldData {
          encounter(id: $encounterID) {
            id
            name
            characterRankings(difficulty: $difficulty, serverRegion: $serverRegion, limit: 100) {
              page
              hasMorePages
              count
              rankings {
                name
                server {
                  name
                  slug
                  region {
                    name
                    slug
                  }
                }
                guild {
                  id
                  name
                }
                rank
                amount
                duration
                report {
                  code
                  startTime
                  fightID
                }
              }
            }
          }
        }
      }
    `;

    try {
      const data = await queryWarcraftLogs(rankingsQuery, {
        encounterID: body.encounterID,
        difficulty,
        serverRegion,
      }) as {
        worldData: {
          encounter: {
            id: number;
            name: string;
            characterRankings: {
              rankings: Array<{
                name: string;
                server: {
                  name: string;
                  slug: string;
                  region: { name: string; slug: string };
                };
                guild: { id: number; name: string } | null;
                rank: number;
                amount: number;
                duration: number;
                report: {
                  code: string;
                  startTime: number;
                  fightID: number;
                };
              }>;
            };
          };
        };
      } | null;

      if (!data?.worldData?.encounter) {
        return NextResponse.json(
          { error: 'Encounter non trouvé' },
          { status: 404 }
        );
      }

      const rankings = data.worldData.encounter.characterRankings?.rankings || [];

      // Grouper par rapport (plusieurs joueurs peuvent être dans le même rapport)
      const reportsMap = new Map<string, {
        code: string;
        startTime: number;
        fightID: number;
        server: string;
        serverSlug: string;
        region: string;
        guild: string | null;
        players: string[];
        rank: number;
        duration: number;
      }>();

      for (const ranking of rankings) {
        if (!ranking.report) continue;

        const reportCode = ranking.report.code;
        const existing = reportsMap.get(reportCode);

        if (existing) {
          existing.players.push(ranking.name);
        } else {
          reportsMap.set(reportCode, {
            code: reportCode,
            startTime: ranking.report.startTime,
            fightID: ranking.report.fightID,
            server: ranking.server.name,
            serverSlug: ranking.server.slug,
            region: ranking.server.region.name,
            guild: ranking.guild?.name || null,
            players: [ranking.name],
            rank: ranking.rank,
            duration: ranking.duration,
          });
        }
      }

      const reports = Array.from(reportsMap.values())
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, limit);

      return NextResponse.json({
        encounter: {
          id: data.worldData.encounter.id,
          name: data.worldData.encounter.name,
        },
        difficulty,
        region: serverRegion,
        totalFound: reports.length,
        reports,
      });
    } catch (error) {
      console.error('Error searching kills:', error);
      // Fallback : retourner une structure vide avec un message
      return NextResponse.json({
        encounter: {
          id: body.encounterID,
          name: 'Unknown',
        },
        difficulty,
        region: serverRegion,
        totalFound: 0,
        reports: [],
        error: 'Impossible de récupérer les données. L\'API WarcraftLogs peut avoir des limitations.',
      });
    }
  } catch (error) {
    console.error('Error in search-kills:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

