const FALLBACK_ORIGIN = "https://www.bitechina.com";

export const seoDefaults = {
  siteName: "BiteChina",
  title: "BiteChina - China, in one bite",
  description: "Bite-sized insights on China's AI, tech, and brands. Curated weekly briefs for busy operators.",
  ogImage: "https://lovable.dev/opengraph-image-p98pqg.png",
};

const normalizePath = (path: string) => {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

const getSiteOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
};

export const buildCanonicalUrl = (path = "/") => {
  return `${getSiteOrigin()}${normalizePath(path)}`;
};

export const formatMetaDescription = (candidate?: string | null, fallback = seoDefaults.description, maxLength = 160) => {
  const normalized = (candidate ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};
