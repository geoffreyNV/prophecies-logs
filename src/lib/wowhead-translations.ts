// Traductions des sorts WoW en français
// Basé sur les données WoWHead et les sorts communs de raid

interface SpellTranslation {
  name: string;
  description?: string;
  icon?: string;
  spellId?: number;
}

// Cache des traductions - Sorts de The War Within / Manaforge Omega
const spellTranslations: Record<string, SpellTranslation> = {
  // Sorts génériques communs
  'Unknown': { name: 'Inconnu', description: 'Sort non identifié' },
  'Dégâts divers': { name: 'Dégâts divers', description: 'Dégâts de source inconnue' },
  'Melee': { name: 'Mêlée', description: 'Attaque au corps à corps' },
  'Auto Attack': { name: 'Attaque automatique', description: 'Attaque automatique au corps à corps' },
  
  // Nexus-King Salhadaar - Manaforge Omega
  'Besiege': { name: 'Siège', description: 'Inflige des dégâts massifs à la zone ciblée.' },
  'Diminishing Path': { name: 'Sentier décroissant', description: 'Crée un chemin de dégâts qui diminue avec le temps.' },
  'Conquer': { name: 'Conquérir', description: 'Attaque puissante qui inflige des dégâts importants.' },
  'Behead': { name: 'Décapiter', description: 'Attaque mortelle qui peut tuer instantanément.' },
  'Overcharged Mana': { name: 'Mana surchargé', description: 'Explosion de mana qui inflige des dégâts d\'Arcane.' },
  'Vanquish': { name: 'Vaincre', description: 'Sort puissant qui inflige des dégâts massifs.' },
  
  // Autres sorts communs de The War Within
  'Arcane Blast': { name: 'Explosion arcanique', description: 'Explosion d\'énergie arcanique.' },
  'Mana Surge': { name: 'Déferlante de mana', description: 'Vague de mana qui inflige des dégâts.' },
  'Void Strike': { name: 'Frappe du Vide', description: 'Attaque du Vide qui inflige des dégâts d\'Ombre.' },
  'Chaos Bolt': { name: 'Trait du chaos', description: 'Trait de chaos qui inflige des dégâts aléatoires.' },
  
  // Sorts génériques de dégâts
  'Shadow Bolt': { name: 'Trait de l\'ombre', description: 'Lance un trait d\'énergie des Ténèbres qui inflige des dégâts d\'Ombre.' },
  'Fireball': { name: 'Boule de feu', description: 'Lance une boule de feu qui inflige des dégâts de Feu.' },
  'Frostbolt': { name: 'Éclair de givre', description: 'Lance un éclair de givre qui inflige des dégâts de Givre.' },
};

// Fonction pour normaliser un nom de sort (pour la correspondance)
function normalizeSpellName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, ' '); // Normaliser les espaces
}

// Fonction pour récupérer la traduction d'un sort
export function getSpellTranslation(abilityName: string): SpellTranslation {
  if (!abilityName) {
    return { name: 'Inconnu', description: 'Sort non identifié' };
  }
  
  // Si on a déjà la traduction exacte, on la retourne
  if (spellTranslations[abilityName]) {
    return spellTranslations[abilityName];
  }
  
  // Essayer une correspondance insensible à la casse
  const normalizedInput = normalizeSpellName(abilityName);
  for (const [key, value] of Object.entries(spellTranslations)) {
    const normalizedKey = normalizeSpellName(key);
    if (normalizedKey === normalizedInput) {
      return value;
    }
  }
  
  // Essayer une correspondance partielle (le nom recherché contient le nom de la traduction ou vice versa)
  for (const [key, value] of Object.entries(spellTranslations)) {
    const normalizedKey = normalizeSpellName(key);
    if (normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
      return value;
    }
  }
  
  // Si pas trouvé, on retourne le nom original avec une traduction générique
  return {
    name: abilityName,
    description: 'Informations non disponibles',
  };
}

// Fonction pour obtenir l'URL WoWHead d'un sort (version française)
export function getWowheadSpellUrl(abilityName: string, spellId?: number): string {
  if (spellId) {
    return `https://fr.wowhead.com/spell=${spellId}`;
  }
  
  // Essayer de trouver le spellId dans les traductions
  const translation = spellTranslations[abilityName];
  if (translation?.spellId) {
    return `https://fr.wowhead.com/spell=${translation.spellId}`;
  }
  
  // Sinon, recherche par nom sur la version française
  const encodedName = encodeURIComponent(abilityName);
  return `https://fr.wowhead.com/spell=${encodedName}`;
}

// Fonction pour obtenir l'icône du sort depuis WoWHead
export function getSpellIconUrl(spellId?: number, abilityName?: string): string {
  if (spellId) {
    return `https://wow.zamimg.com/images/wow/icons/large/spell_${spellId}.jpg`;
  }
  
  // Fallback: utiliser une icône générique
  return 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
}

// Fonction pour charger dynamiquement les traductions depuis WoWHead (via leur script)
export async function fetchSpellTranslationFromWowhead(spellName: string): Promise<SpellTranslation | null> {
  try {
    // Note: WoWHead n'a pas d'API publique directe
    // On peut utiliser leur script de tooltips côté client, mais pour le serveur
    // il faudrait scraper (non recommandé pour des raisons légales)
    // Pour l'instant, on retourne null et on utilise les traductions locales
    return null;
  } catch (error) {
    console.error('Error fetching spell translation:', error);
    return null;
  }
}
