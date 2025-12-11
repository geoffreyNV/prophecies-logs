const WARCRAFTLOGS_API_URL = 'https://www.warcraftlogs.com/api/v2/client';
const WARCRAFTLOGS_AUTH_URL = 'https://www.warcraftlogs.com/oauth/token';

let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 300000) {
    return accessToken;
  }

  const clientId = process.env.WARCRAFTLOGS_CLIENT_ID;
  const clientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing credentials:', { clientId: !!clientId, clientSecret: !!clientSecret });
    throw new Error('WarcraftLogs credentials not configured. Check .env.local file.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  console.log('Authenticating with WarcraftLogs...');
  
  const response = await fetch(WARCRAFTLOGS_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error('Auth failed:', response.status, responseText);
    throw new Error(`Failed to authenticate with WarcraftLogs: ${response.status}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error('Failed to parse auth response:', responseText);
    throw new Error('Invalid response from WarcraftLogs authentication');
  }

  if (!data.access_token) {
    console.error('No access token in response:', data);
    throw new Error('No access token received from WarcraftLogs');
  }

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  console.log('Authentication successful!');
  return accessToken!;
}

export async function queryWarcraftLogs(query: string, variables: Record<string, unknown> = {}): Promise<unknown> {
  const token = await getAccessToken();

  const response = await fetch(WARCRAFTLOGS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('API request failed:', response.status, responseText);
    throw new Error(`WarcraftLogs API request failed: ${response.status}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error('Failed to parse API response:', responseText.substring(0, 500));
    throw new Error('Invalid JSON response from WarcraftLogs API');
  }

  if (result.errors && result.errors.length > 0) {
    console.error('GraphQL errors:', result.errors);
    throw new Error(result.errors[0].message || 'GraphQL query failed');
  }

  return result.data;
}

export async function getReport(reportCode: string) {
  const query = `
    query GetReport($code: String!) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime
          zone {
            id
            name
          }
          owner {
            name
          }
          fights(killType: Encounters) {
            id
            name
            encounterID
            startTime
            endTime
            kill
            difficulty
            fightPercentage
            lastPhase
            lastPhaseIsIntermission
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(query, { code: reportCode }) as {
    reportData: { report: unknown }
  } | null;
  
  if (!data || !data.reportData) {
    throw new Error('No data returned from WarcraftLogs');
  }
  
  return data.reportData.report;
}

export async function getFightDeaths(reportCode: string, fightId: number) {
  const query = `
    query GetFightDeaths($code: String!, $fightID: Int!) {
      reportData {
        report(code: $code) {
          fights(fightIDs: [$fightID]) {
            id
            name
            startTime
            endTime
          }
          events(
            fightIDs: [$fightID]
            dataType: Deaths
            limit: 500
          ) {
            data
          }
          masterData {
            actors {
              id
              name
              type
              subType
            }
            abilities {
              gameID
              name
            }
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(query, { code: reportCode, fightID: fightId }) as {
    reportData: { report: unknown }
  } | null;
  
  return data?.reportData?.report;
}

export async function getFightSummary(reportCode: string, fightId: number) {
  const query = `
    query GetFightSummary($code: String!, $fightID: Int!) {
      reportData {
        report(code: $code) {
          playerDetails(fightIDs: [$fightID])
          fights(fightIDs: [$fightID]) {
            id
            name
            encounterID
            startTime
            endTime
            kill
            difficulty
            fightPercentage
          }
        }
      }
    }
  `;

  const data = await queryWarcraftLogs(query, { code: reportCode, fightID: fightId }) as {
    reportData: { report: unknown }
  } | null;
  
  return data?.reportData?.report;
}

// Nouvelle fonction pour récupérer les données DPS
export async function getFightDPS(reportCode: string, fightId: number, startTime?: number, endTime?: number) {
  // Récupérer d'abord les infos du fight pour avoir les timestamps
  const fightQuery = `
    query GetFightInfo($code: String!, $fightID: Int!) {
      reportData {
        report(code: $code) {
          fights(fightIDs: [$fightID]) {
            id
            name
            startTime
            endTime
          }
        }
      }
    }
  `;
  
  const fightData = await queryWarcraftLogs(fightQuery, { code: reportCode, fightID: fightId }) as {
    reportData: { report: { fights: Array<{ startTime: number; endTime: number }> } }
  } | null;
  
  const fight = fightData?.reportData?.report?.fights?.[0];
  if (!fight) return null;
  
  // Calculer les timestamps relatifs au fight
  const fightStartTime = fight.startTime;
  const fightEndTime = fight.endTime;
  
  // Si des filtres sont fournis, les convertir en timestamps absolus
  const filterStart = startTime !== undefined ? fightStartTime + (startTime * 1000) : undefined;
  const filterEnd = endTime !== undefined ? fightStartTime + (endTime * 1000) : undefined;

  // Requête pour la table DPS avec filtres optionnels
  const dpsQuery = `
    query GetFightDPS($code: String!, $fightID: Int!${filterStart !== undefined ? ', $startTime: Float!' : ''}${filterEnd !== undefined ? ', $endTime: Float!' : ''}) {
      reportData {
        report(code: $code) {
          table(
            fightIDs: [$fightID]
            dataType: DamageDone
            ${filterStart !== undefined ? 'startTime: $startTime' : ''}
            ${filterEnd !== undefined ? 'endTime: $endTime' : ''}
          )
          fights(fightIDs: [$fightID]) {
            id
            name
            startTime
            endTime
            kill
            difficulty
            fightPercentage
          }
          masterData {
            actors {
              id
              name
              type
              subType
            }
          }
        }
      }
    }
  `;

  const variables: Record<string, unknown> = { code: reportCode, fightID: fightId };
  if (filterStart !== undefined) variables.startTime = filterStart;
  if (filterEnd !== undefined) variables.endTime = filterEnd;

  const data = await queryWarcraftLogs(dpsQuery, variables) as {
    reportData: { report: unknown }
  } | null;
  
  const reportData = data?.reportData?.report;
  return {
    ...(reportData || {}),
    fightDuration: (fightEndTime - fightStartTime) / 1000,
    filterStart: startTime,
    filterEnd: endTime,
  };
}

// Récupérer les DPS pour plusieurs fights en une fois
export async function getMultipleFightsDPS(
  reportCode: string, 
  fightIds: number[], 
  startTime?: number, 
  endTime?: number
) {
  const results = [];
  
  for (const fightId of fightIds) {
    try {
      const dpsData = await getFightDPS(reportCode, fightId, startTime, endTime);
      if (dpsData) {
        results.push({ fightId, ...dpsData });
      }
    } catch (error) {
      console.error(`Error fetching DPS for fight ${fightId}:`, error);
    }
  }
  
  return results;
}

/**
 * Récupère les statistiques moyennes de DPS par spécialisation pour un encounter
 * Nexus-King Salhadaar = encounterID 3134
 */
export async function getEncounterSpecAverages(
  encounterID: number,
  difficulty: number = 4, // Héroïque par défaut
  serverRegion: string = 'EU'
): Promise<Record<string, { averageDPS: number; medianDPS: number; sampleSize: number }>> {
  const query = `
    query GetEncounterSpecAverages($encounterID: Int!, $difficulty: Int!, $serverRegion: String!) {
      worldData {
        encounter(id: $encounterID) {
          id
          name
          characterRankings(
            difficulty: $difficulty
            serverRegion: $serverRegion
            metric: dps
          )
        }
      }
    }
  `;

  try {
    const data = await queryWarcraftLogs(query, {
      encounterID,
      difficulty,
      serverRegion,
    }) as {
      worldData: {
        encounter: {
          characterRankings: string; // JSON string
        };
      };
    } | null;

    if (!data?.worldData?.encounter?.characterRankings) {
      return {};
    }

    // Parser le JSON string
    const rankings = JSON.parse(data.worldData.encounter.characterRankings) as Array<{
      spec: string;
      amount: number;
    }>;

    // Grouper par spécialisation et calculer les moyennes
    const specData: Record<string, number[]> = {};
    
    for (const ranking of rankings) {
      if (!ranking.spec || !ranking.amount) continue;
      if (!specData[ranking.spec]) {
        specData[ranking.spec] = [];
      }
      specData[ranking.spec].push(ranking.amount);
    }

    const result: Record<string, { averageDPS: number; medianDPS: number; sampleSize: number }> = {};

    for (const [spec, dpsValues] of Object.entries(specData)) {
      if (dpsValues.length === 0) continue;
      
      const sorted = [...dpsValues].sort((a, b) => a - b);
      const average = dpsValues.reduce((a, b) => a + b, 0) / dpsValues.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      result[spec] = {
        averageDPS: Math.round(average),
        medianDPS: Math.round(median),
        sampleSize: dpsValues.length,
      };
    }

    return result;
  } catch (error) {
    console.error('Error fetching encounter spec averages:', error);
    return {};
  }
}
