import { useEffect } from "react";
import { useLocation } from "wouter";
import { getCityBySlug } from "@/data/city-pages";
import { getPageMetadata } from "@/lib/page-metadata";

export default function PageMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const city = location.startsWith("/areas/") ? getCityBySlug(location.slice(7)) : undefined;
    const metadata = getPageMetadata(location, city);
    document.title = metadata.title;
    function setMeta(name: string, content: string, property = false) {
      const attribute = property ? "property" : "name";
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.content = content;
    }
    setMeta("description", metadata.description);
    setMeta("robots", metadata.robots);
    setMeta("og:title", metadata.title, true);
    setMeta("og:description", metadata.description, true);
    setMeta("twitter:title", metadata.title);
    setMeta("twitter:description", metadata.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (metadata.canonical) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = metadata.canonical;
      setMeta("og:url", metadata.canonical, true);
    } else {
      canonical?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
    }
  }, [location]);
  return null;
}
