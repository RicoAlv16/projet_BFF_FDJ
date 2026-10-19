// ==============================================================================
// FDJ Parions Sport - Initialisation MongoDB CMS (Bannières & Vitrine)
// ==============================================================================

db = db.getSiblingDB('fdj_cms');

// 1. Collection des Bannières Marketing / Promotions
db.createCollection('banners');
db.banners.insertMany([
  {
    title: "Clásico : Cotes Boostées sur PSG vs OM !",
    subtitle: "Mise max 20€ - Cote boostée à 2.80 au lieu de 2.10",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2",
    ctaText: "Parier en direct",
    ctaLink: "/match/match-psg-om",
    active: true,
    displayOrder: 1,
    targetChannel: "ALL", // ALL, PSEL (En Ligne), PSPDV (Point de Vente)
    createdAt: new Date()
  },
  {
    title: "Loto Foot 15 : Pactole de 500 000 € !",
    subtitle: "Préparez votre grille sur mobile et scannez chez votre buraliste",
    imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20",
    ctaText: "Remplir ma grille",
    ctaLink: "/point-de-vente/loto-foot",
    active: true,
    displayOrder: 2,
    targetChannel: "PSPDV",
    createdAt: new Date()
  },
  {
    title: "Jeu Responsable - Mentions Légales ANJ",
    subtitle: "Famille, amis, argent : le jeu peut vous isoler. 09 74 75 13 13 (appel non surtaxé)",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
    ctaText: "En savoir plus",
    ctaLink: "/jeu-responsable",
    active: true,
    displayOrder: 99,
    targetChannel: "ALL",
    createdAt: new Date()
  }
]);

// 2. Collection des Compétitions Mises en Avant
db.createCollection('featured_competitions');
db.featured_competitions.insertMany([
  { name: "Ligue 1 McDonald's", sport: "Football", badge: "🇫🇷 Top France", displayOrder: 1 },
  { name: "UEFA Champions League", sport: "Football", badge: "⭐ Élite", displayOrder: 2 },
  { name: "Premier League", sport: "Football", badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", displayOrder: 3 },
  { name: "Roland Garros", sport: "Tennis", badge: "🎾 Grand Chelem", displayOrder: 4 }
]);
