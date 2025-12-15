import type { Language } from "@/lib/translations";

const slugify = (title: string | null | undefined, id: number) => {
  const trimmed = title?.trim();
  if (!trimmed) {
    return `story-${id}`;
  }

  const sanitized = trimmed
    .replace(/[^\w\s\-\uAC00-\uD7A3\u4E00-\u9FFF]/g, " ")
    .replace(/_+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return encodeURIComponent(sanitized || `story-${id}`);
};

export const buildArticlePath = (
  params: {
    id: number | string;
    title?: string | null;
    titleEn?: string | null;
    titleKo?: string | null;
  },
  language: Language
) => {
  const rawId = typeof params.id === "string" ? Number(params.id) : params.id;
  const safeId = Number.isFinite(rawId) ? Number(rawId) : 0;
  const locale = language === "ko" ? "ko" : "en";
  const titleSource =
    language === "ko"
      ? params.titleKo ?? params.titleEn ?? params.title
      : params.titleEn ?? params.titleKo ?? params.title;
  const slug = slugify(titleSource ?? params.title ?? null, safeId || 0);
  return `/${locale}/article/${safeId}/${slug}`;
};
