import { HomeContent } from "./home-content";
import { portfolioJsonLd } from "./seo";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(portfolioJsonLd()).replace(/</g, "\\u003c"),
        }}
      />
      <HomeContent />
    </>
  );
}
