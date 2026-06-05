import type { MetadataRoute } from "next";
import { shotImages, siteConfig } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      images: shotImages.map((shot) => shot.url),
    },
  ];
}
