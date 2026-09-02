import { useEffect } from "react";

const SITE_URL = "https://studyshield.study";
const SITE_NAME = "StudyShield";
const DEFAULT_IMAGE = `${SITE_URL}/shield.svg`;

type JsonLd = Record<string, unknown>;

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: JsonLd | JsonLd[];
}

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLinkCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEO({
  title,
  description,
  canonical,
  robots,
  ogTitle,
  ogDescription,
  ogUrl,
  ogImage,
  ogType = "website",
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const canonicalHref = canonical
      ? canonical.startsWith("http")
        ? canonical
        : `${SITE_URL}${canonical.startsWith("/") ? canonical : `/${canonical}`}`
      : SITE_URL + "/";

    if (title) document.title = title;
    if (description) upsertMetaByName("description", description);
    if (robots) upsertMetaByName("robots", robots);
    else upsertMetaByName("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    upsertLinkCanonical(canonicalHref);

    // Open Graph
    upsertMetaByProperty("og:type", ogType);
    upsertMetaByProperty("og:site_name", SITE_NAME);
    upsertMetaByProperty("og:url", ogUrl ?? canonicalHref);
    if (ogTitle ?? title) upsertMetaByProperty("og:title", (ogTitle ?? title)!);
    if (ogDescription ?? description) upsertMetaByProperty("og:description", (ogDescription ?? description)!);
    upsertMetaByProperty("og:image", ogImage ?? DEFAULT_IMAGE);

    // Twitter
    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:url", ogUrl ?? canonicalHref);
    if (twitterTitle ?? ogTitle ?? title) upsertMetaByName("twitter:title", (twitterTitle ?? ogTitle ?? title)!);
    if (twitterDescription ?? ogDescription ?? description)
      upsertMetaByName("twitter:description", (twitterDescription ?? ogDescription ?? description)!);
    upsertMetaByName("twitter:image", twitterImage ?? ogImage ?? DEFAULT_IMAGE);

    // JSON-LD
    // Remove previous page-specific json-ld nodes (keep the static ones from index.html,
    // but page-specific ones are marked with data-seo="dynamic").
    document.querySelectorAll('script[data-seo="dynamic"]').forEach((n) => n.remove());
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      for (const obj of arr) {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo", "dynamic");
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
      }
    }
  }, [title, description, canonical, robots, ogTitle, ogDescription, ogUrl, ogImage, ogType, twitterTitle, twitterDescription, twitterImage, jsonLd]);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CANONICAL = {
  home: `${SITE_URL}/`,
  about: `${SITE_URL}/about`,
  contact: `${SITE_URL}/contact`,
  privacy: `${SITE_URL}/privacy`,
  terms: `${SITE_URL}/terms`,
  login: `${SITE_URL}/login`,
  signup: `${SITE_URL}/signup`,
} as const;

export const DEFAULT_TITLE = "StudyShield – AI Study Planner & Focus App for JEE & NEET";
export const DEFAULT_DESCRIPTION =
  "StudyShield is an AI-powered study platform for JEE & NEET with personalized study plans, backlog and revision tracking, focus timer and distraction blocking.";
