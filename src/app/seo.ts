import { shots } from "./shots-data";

export const siteConfig = {
  name: "Bedirhan Dogan",
  title: "Bedirhan - Digital Designer",
  description:
    "Bedirhan Dogan is a digital designer creating web, product, brand, and motion experiences that combine aesthetics and functionality.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://bedirhandogan.com").replace(
    /\/$/,
    "",
  ),
  language: "en",
  locale: "en_US",
  calUrl: "https://cal.com/bedirhandogan/30min",
  sameAs: [
    "https://x.com/bedirhandogn",
    "https://www.linkedin.com/in/bedirhandogan",
  ],
  keywords: [
    "Bedirhan Dogan",
    "digital designer",
    "product designer",
    "web designer",
    "brand designer",
    "motion designer",
    "interface designer",
    "design portfolio",
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

export const shotImages = shots.map((shot) => ({
  ...shot,
  url: absoluteUrl(shot.image),
}));

export function portfolioJsonLd() {
  const personId = `${siteConfig.url}/#person`;
  const websiteId = `${siteConfig.url}/#website`;
  const portfolioId = `${siteConfig.url}/#portfolio`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: siteConfig.name,
        url: siteConfig.url,
        jobTitle: "Digital Designer",
        description: siteConfig.description,
        sameAs: siteConfig.sameAs,
        knowsAbout: [
          "Web design",
          "Product design",
          "Brand identity",
          "Motion design",
          "Interface design",
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteConfig.name,
        url: siteConfig.url,
        inLanguage: siteConfig.language,
        description: siteConfig.description,
        author: {
          "@id": personId,
        },
      },
      {
        "@type": "CollectionPage",
        "@id": portfolioId,
        name: `${siteConfig.name} design portfolio`,
        url: siteConfig.url,
        inLanguage: siteConfig.language,
        description: siteConfig.description,
        isPartOf: {
          "@id": websiteId,
        },
        about: {
          "@id": personId,
        },
        hasPart: shotImages.map((shot, index) => ({
          "@type": "CreativeWork",
          position: index + 1,
          name: shot.title,
          description: shot.description,
          genre: shot.subtitle,
          image: shot.url,
          creator: {
            "@id": personId,
          },
        })),
      },
    ],
  };
}
