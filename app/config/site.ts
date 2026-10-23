export const siteConfig = {
  name: "MARC INGINEERING SERVICE SARL",
  shortName: "MARC Ingineering",
  description:
    "MARC INGINEERING SERVICE SARL, basée à Lubumbashi (RDC) : fourniture d'équipements, de pièces et de consommables, et services d'ingénierie pour l'industrie et le secteur minier.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: "/images/logo.png",

  address: {
    line: "Commune et Ville de Lubumbashi",
    city: "Lubumbashi",
    region: "Haut-Katanga",
    country: "République Démocratique du Congo",
    countryCode: "CD",
  },

  location: {
    display: {
      fr: "Lubumbashi, Haut-Katanga, RDC",
      en: "Lubumbashi, Haut-Katanga, DRC",
    },
  },

  phones: ["+243 992 224 458", "+243 900 041 696"],
  email: "messarl2023@gmail.com",
  whatsapp: "243992224458",

  legal: {
    rccm: "CD/LSH/RCCM/26-B-00277",
    impotNumber: "A2609081A",
  },
} as const;
