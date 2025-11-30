import { NextResponse } from 'next/server';
import { queryWarcraftLogs } from '@/lib/warcraftlogs';

interface ZoneReportsRequest {
  zoneID: number;
  encounterID: number;
  difficulty?: number;
  serverRegion?: string;
  serverSlug?: string; // Filtre par serveur spécifique
  limit?: number;
  killsOnly?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: ZoneReportsRequest = await request.json();

    if (!body.zoneID || !body.encounterID) {
      return NextResponse.json(
        { error: 'Zone ID et Encounter ID sont requis' },
        { status: 400 }
      );
    }

    const difficulty = body.difficulty || 5; // Mythique par défaut
    const serverRegion = 'EU'; // Toujours Europe
    const limit = 100; // Toujours 100 logs
    const killsOnly = body.killsOnly !== false; // Par défaut, seulement les kills

    console.log(`Fetching reports for zone ${body.zoneID}, encounter ${body.encounterID}, difficulty ${difficulty}`);

    // Utiliser fightRankings qui est le bon champ selon l'API
    // Note: serverSlug n'est peut-être pas supporté dans fightRankings, on filtrera après
    const query = `
      query GetFightRankings($encounterID: Int!, $difficulty: Int!, $serverRegion: String!) {
        worldData {
          encounter(id: $encounterID) {
            id
            name
            fightRankings(difficulty: $difficulty, serverRegion: $serverRegion)
          }
        }
      }
    `;

    const variables: Record<string, unknown> = {
      encounterID: body.encounterID,
      difficulty,
      serverRegion,
    };

    try {
      const data = await queryWarcraftLogs(query, variables) as {
        worldData: {
          encounter: {
            id: number;
            name: string;
            fightRankings: string; // JSON string
          };
        };
      } | null;

      if (!data?.worldData?.encounter) {
        return NextResponse.json(
          { error: 'Encounter non trouvé' },
          { status: 404 }
        );
      }

      // Parser le JSON des rankings
      let rankings: Array<{
        rank: number;
        guild: {
          id: number;
          name: string;
          server: {
            name: string;
            slug: string;
            region: { name: string; slug: string };
          };
        } | null;
        amount: number;
        duration: number;
        report: {
          code: string;
          startTime: number;
          fightID: number;
        } | null;
      }> = [];

      try {
        const rankingsData = typeof data.worldData.encounter.fightRankings === 'string'
          ? JSON.parse(data.worldData.encounter.fightRankings)
          : data.worldData.encounter.fightRankings;
        
        if (rankingsData) {
          // Le format peut varier, essayer différentes structures
          if (Array.isArray(rankingsData)) {
            rankings = rankingsData;
          } else if (rankingsData.rankings && Array.isArray(rankingsData.rankings)) {
            rankings = rankingsData.rankings;
          } else if (rankingsData.data && Array.isArray(rankingsData.data)) {
            rankings = rankingsData.data;
          }
        }
      } catch (parseError) {
        console.error('Error parsing fightRankings:', parseError);
        console.log('Raw fightRankings:', data.worldData.encounter.fightRankings);
      }

      // Filtrer seulement ceux qui ont un rapport valide
      let validRankings = rankings.filter(r => r.report && r.report.code);

      // Filtrer par serveur si spécifié (côté serveur car l'API peut ne pas supporter serverSlug)
      if (body.serverSlug && body.serverSlug !== 'all') {
        validRankings = validRankings.filter(r => {
          const server = r.guild?.server;
          return server && server.slug === body.serverSlug;
        });
      }

      // Grouper par rapport (plusieurs rankings peuvent être dans le même rapport)
      const reportsMap = new Map<string, {
        code: string;
        startTime: number;
        fightID: number;
        server: string;
        serverSlug: string;
        region: string;
        guild: string | null;
        guildID: number | null;
        players: string[];
        rank: number;
        duration: number;
        encounterName: string;
      }>();

      for (const ranking of validRankings) {
        if (!ranking.report || !ranking.report.code) continue;

        const reportCode = ranking.report.code;
        const existing = reportsMap.get(reportCode);

        if (existing) {
          // Garder le meilleur rank
          if (ranking.rank < existing.rank) {
            existing.rank = ranking.rank;
          }
        } else {
          const server = ranking.guild?.server || { name: 'Unknown', slug: 'unknown', region: { name: serverRegion, slug: serverRegion.toLowerCase() } };
          
          reportsMap.set(reportCode, {
            code: reportCode,
            startTime: ranking.report.startTime,
            fightID: ranking.report.fightID,
            server: server.name,
            serverSlug: server.slug,
            region: server.region.name,
            guild: ranking.guild?.name || null,
            guildID: ranking.guild?.id || null,
            players: [], // Sera rempli si on a des infos de joueurs
            rank: ranking.rank,
            duration: ranking.duration,
            encounterName: data.worldData.encounter.name,
          });
        }
      }

      // Mélanger aléatoirement et prendre 100
      const allReports = Array.from(reportsMap.values());
      
      // Fonction pour mélanger aléatoirement (Fisher-Yates)
      const shuffle = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      const reports = shuffle(allReports).slice(0, limit);

      return NextResponse.json({
        zoneID: body.zoneID,
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
      console.error('Error fetching zone reports:', error);
      return NextResponse.json({
        zoneID: body.zoneID,
        encounter: {
          id: body.encounterID,
          name: 'Unknown',
        },
        difficulty,
        region: serverRegion,
        totalFound: 0,
        reports: [],
        error: 'Impossible de récupérer les données. L\'API WarcraftLogs peut avoir des limitations ou la requête est incorrecte.',
      });
    }
  } catch (error) {
    console.error('Error in zone-reports:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
