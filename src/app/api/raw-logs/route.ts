import { NextResponse } from 'next/server';
import { getReport, getFightDeaths, getFightSummary, queryWarcraftLogs } from '@/lib/warcraftlogs';

interface RawLogsRequest {
  reportCode: string;
  fightIds?: number[];
  includeEvents?: boolean;
  includeTable?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: RawLogsRequest = await request.json();

    if (!body.reportCode) {
      return NextResponse.json(
        { error: 'Le code du rapport est requis' },
        { status: 400 }
      );
    }

    console.log(`Fetching raw logs for report: ${body.reportCode}`);

    // Récupérer les infos du rapport
    const report = await getReport(body.reportCode) as {
      code: string;
      title: string;
      startTime: number;
      endTime: number;
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
      }>;
    } | null;

    if (!report) {
      return NextResponse.json(
        { error: 'Rapport non trouvé' },
        { status: 404 }
      );
    }

    // Filtrer les fights si spécifiés
    const fightsToExport = body.fightIds
      ? report.fights.filter(f => body.fightIds?.includes(f.id))
      : report.fights;

    const rawData: {
      report: typeof report;
      fights: Array<{
        fightId: number;
        fightInfo: typeof report.fights[0];
        summary?: unknown;
        deaths?: unknown;
        rawEvents?: unknown;
      }>;
      masterData?: unknown;
    } = {
      report: {
        code: report.code,
        title: report.title,
        startTime: report.startTime,
        endTime: report.endTime,
        zone: report.zone,
        owner: report.owner,
        fights: report.fights,
      },
      fights: [],
    };

    // Pour chaque fight, récupérer les données brutes
    for (const fight of fightsToExport) {
      const fightData: {
        fightId: number;
        fightInfo: typeof fight;
        summary?: unknown;
        deaths?: unknown;
        rawEvents?: unknown;
      } = {
        fightId: fight.id,
        fightInfo: fight,
      };

      // Récupérer le summary si demandé
      if (body.includeTable !== false) {
        try {
          const summary = await getFightSummary(body.reportCode, fight.id);
          fightData.summary = summary;
        } catch (error) {
          console.error(`Error fetching summary for fight ${fight.id}:`, error);
        }
      }

      // Récupérer les morts si demandé
      if (body.includeEvents !== false) {
        try {
          const deaths = await getFightDeaths(body.reportCode, fight.id);
          fightData.deaths = deaths;
        } catch (error) {
          console.error(`Error fetching deaths for fight ${fight.id}:`, error);
        }
      }

      // Récupérer les events bruts (tous les types)
      if (body.includeEvents !== false) {
        try {
          const eventsQuery = `
            query GetRawEvents($code: String!, $fightID: Int!) {
              reportData {
                report(code: $code) {
                  events(
                    fightIDs: [$fightID]
                    limit: 10000
                  ) {
                    data
                    nextPageTimestamp
                  }
                }
              }
            }
          `;

          const eventsData = await queryWarcraftLogs(eventsQuery, {
            code: body.reportCode,
            fightID: fight.id,
          });

          fightData.rawEvents = eventsData;
        } catch (error) {
          console.error(`Error fetching raw events for fight ${fight.id}:`, error);
        }
      }

      rawData.fights.push(fightData);
    }

    // Récupérer les masterData une fois (commun à tous les fights)
    if (fightsToExport.length > 0) {
      try {
        const masterDataQuery = `
          query GetMasterData($code: String!) {
            reportData {
              report(code: $code) {
                masterData {
                  actors {
                    id
                    name
                    type
                    subType
                    server
                  }
                  abilities {
                    gameID
                    name
                    icon
                  }
                }
              }
            }
          }
        `;

        const masterData = await queryWarcraftLogs(masterDataQuery, {
          code: body.reportCode,
        });

        rawData.masterData = masterData;
      } catch (error) {
        console.error('Error fetching masterData:', error);
      }
    }

    return NextResponse.json(rawData);
  } catch (error) {
    console.error('Error fetching raw logs:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

