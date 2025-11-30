import { NextResponse } from 'next/server';

// Liste des serveurs européens populaires
// L'API WarcraftLogs ne permet pas de récupérer directement la liste des serveurs
// On utilise donc une liste statique des serveurs EU les plus populaires
const EU_SERVERS = [
  { id: 0, name: 'Tous les serveurs', slug: 'all', region: 'EU' },
  { id: 1, name: 'Hyjal', slug: 'hyjal', region: 'EU' },
  { id: 2, name: 'Sargeras', slug: 'sargeras', region: 'EU' },
  { id: 3, name: 'Kazzak', slug: 'kazzak', region: 'EU' },
  { id: 4, name: 'Tarren Mill', slug: 'tarren-mill', region: 'EU' },
  { id: 5, name: 'Stormrage', slug: 'stormrage', region: 'EU' },
  { id: 6, name: 'Draenor', slug: 'draenor', region: 'EU' },
  { id: 7, name: 'Twisting Nether', slug: 'twisting-nether', region: 'EU' },
  { id: 8, name: 'Outland', slug: 'outland', region: 'EU' },
  { id: 9, name: 'Ragnaros', slug: 'ragnaros', region: 'EU' },
  { id: 10, name: 'Silvermoon', slug: 'silvermoon', region: 'EU' },
  { id: 11, name: 'Kil\'jaeden', slug: 'kiljaeden', region: 'EU' },
  { id: 12, name: 'Burning Legion', slug: 'burning-legion', region: 'EU' },
  { id: 13, name: 'Drak\'thul', slug: 'drakthul', region: 'EU' },
  { id: 14, name: 'Sylvanas', slug: 'sylvanas', region: 'EU' },
  { id: 15, name: 'Khadgar', slug: 'khadgar', region: 'EU' },
  { id: 16, name: 'Auchindoun', slug: 'auchindoun', region: 'EU' },
  { id: 17, name: 'Dun Modr', slug: 'dun-modr', region: 'EU' },
  { id: 18, name: 'Uldum', slug: 'uldum', region: 'EU' },
  { id: 19, name: 'Sanguino', slug: 'sanguino', region: 'EU' },
  { id: 20, name: 'Zul\'jin', slug: 'zuljin', region: 'EU' },
  { id: 21, name: 'Thrall', slug: 'thrall', region: 'EU' },
  { id: 22, name: 'Blackmoore', slug: 'blackmoore', region: 'EU' },
  { id: 23, name: 'Eredar', slug: 'eredar', region: 'EU' },
  { id: 24, name: 'Frostwolf', slug: 'frostwolf', region: 'EU' },
  { id: 25, name: 'Ner\'zhul', slug: 'nerzhul', region: 'EU' },
  { id: 26, name: 'Turalyon', slug: 'turalyon', region: 'EU' },
  { id: 27, name: 'Dentarg', slug: 'dentarg', region: 'EU' },
  { id: 28, name: 'Baelgun', slug: 'baelgun', region: 'EU' },
  { id: 29, name: 'Alexstrasza', slug: 'alexstrasza', region: 'EU' },
  { id: 30, name: 'Alleria', slug: 'alleria', region: 'EU' },
];

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const region = url.searchParams.get('region') || 'EU';

    // Retourner la liste des serveurs pour la région demandée
    if (region === 'EU') {
      return NextResponse.json({ servers: EU_SERVERS });
    }

    // Pour d'autres régions, on pourrait ajouter d'autres listes
    return NextResponse.json({ servers: [{ id: 0, name: 'Tous les serveurs', slug: 'all', region }] });
  } catch (error) {
    console.error('Error in servers route:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des serveurs' }, { status: 500 });
  }
}
