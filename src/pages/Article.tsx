import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Tag, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsBySlug, fetchNewsById, fetchNewsList, type PublicNewsItem } from "@/lib/api/news";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, formatMetaDescription, seoDefaults } from "@/lib/seo";
import { buildArticlePath } from "@/lib/articleLinks";

const stripHtml = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const htmlLikePattern = /<\/?[a-z][^>]*>/i;

const richTextSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes || {}),
    "*": [
      ...((defaultSchema.attributes && defaultSchema.attributes["*"]) || []),
      ["style", /^[-:,;#%\.\w\s()]+$/i],
      ["className", /^[-_\w\s]+$/],
      ["align", /^(left|right|center|justify)$/],
    ],
    p: [
      ...((defaultSchema.attributes && defaultSchema.attributes.p) || []),
      ["style", /^[-:,;#%\.\w\s()]+$/i],
    ],
    span: [
      ...((defaultSchema.attributes && defaultSchema.attributes.span) || []),
      ["style", /^[-:,;#%\.\w\s()]+$/i],
      ["className", /^[-_\w\s]+$/],
    ],
  },
};

export default function Article() {
  const params = useParams<{ slug?: string; locale?: string; id?: string; title?: string }>();
  const slug = params.slug;
  const localeParam = params.locale;
  const idParam = params.id;
  const { t, language } = useLanguage();
  const { user, subscription } = useAuth();
  const isProSubscriber = subscription.subscribed;

  const normalizedLocaleParam = localeParam === "ko" ? "ko" : localeParam === "en" ? "en" : null;
  const numericId = idParam ? Number(idParam) : null;
  const canFetchById = Boolean(normalizedLocaleParam && numericId && Number.isFinite(numericId));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["article", canFetchById ? `id:${numericId}` : slug ?? ""],
    enabled: Boolean(canFetchById ? numericId : slug),
    queryFn: async () => {
      if (canFetchById && numericId) {
        const result = await fetchNewsById(numericId);
        if (result) {
          return result;
        }
      }

      if (slug) {
        return fetchNewsBySlug(slug);
      }
      return null;
    },
  });

  // 获取相关文章（优先基于分类，否则获取最新文章）
  const { data: relatedNewsData } = useQuery({
    queryKey: ["relatedNews", data?.category, slug],
    enabled: Boolean(data),
    queryFn: async () => {
      if (!data) return [];
      
      // 优先获取相同分类的文章
      if (data.category) {
        const result = await fetchNewsList({ category: data.category, limit: 10 });
        if (result && result.length > 0) {
          return result;
        }
      }
      
      // 如果没有分类或相同分类下没有文章，则获取最新文章
      const result = await fetchNewsList({ limit: 10, latest: true });
      return result || [];
    },
  });

  const article = useMemo(() => {
    if (!data) return null;

    const canonicalSlug = (data.slug ?? slug ?? "").trim();
    const titleCandidate = language === "ko" ? data.titleKo ?? data.titleEn : data.titleEn ?? data.titleKo;
    const contentCandidate = language === "ko" ? data.translationKo ?? data.translationEn ?? data.content : data.translationEn ?? data.translationKo ?? data.content;
    const categorySource = language === "ko"
      ? data["category-ko"] ?? data.category ?? data["category-en"]
      : data["category-en"] ?? data.category ?? data["category-ko"];
    const tags = (categorySource ?? "")
      .split(/[,|/]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const rawContent = (contentCandidate || "").trim();
    const hasHtml = htmlLikePattern.test(rawContent);
    let normalizedContent = rawContent;
    if (!hasHtml) {
      normalizedContent = normalizedContent.replace(/^(#+)(?![\s#])/gm, "$1 ");
      normalizedContent = normalizedContent.replace(new RegExp("^(#{1,6}\\s[^\\n]+)(?!\\n)", "gm"), "$1\n");
    }
    const plainContent = stripHtml(normalizedContent || "").trim();

    const path = buildArticlePath(
      {
        id: data.id,
        title: stripHtml(data.title || ""),
        titleEn: data.titleEn,
        titleKo: data.titleKo,
      },
      language
    );

    return {
      id: String(data.id),
      slug: canonicalSlug,
      title: stripHtml(titleCandidate || data.title || data.link || "").trim(),
      date: data.isoDate,
      tags,
      contentPlain: plainContent,
      contentRich: normalizedContent,
      recommendation: null as string | null,
      path,
    };
  }, [data, language, slug]);

  // 处理相关文章：过滤当前文章，必须同时有韩文和英文标题，限制数量
  const relatedArticles = useMemo(() => {
    if (!relatedNewsData || !data) return [];

    const currentSlug = (data.slug ?? slug ?? "").trim();
    return relatedNewsData
      .filter((item) => Boolean(item.titleKo && item.titleEn))
      .filter((item) => item.id !== data.id && (item.slug?.trim() ?? null) !== currentSlug)
      .slice(0, 4) // 限制4篇
      .map((item) => ({
        id: item.id,
        title: language === "ko" ? stripHtml(item.titleKo || item.title).trim() : stripHtml(item.titleEn || item.title).trim(),
        date: item.isoDate,
        path: buildArticlePath(
          {
            id: item.id,
            title: stripHtml(item.title),
            titleEn: item.titleEn,
            titleKo: item.titleKo,
          },
          language
        ),
      }));
  }, [relatedNewsData, data, language, slug]);

  const articlePlainContent = article?.contentPlain ?? "";
  const articleRichContent = article?.contentRich ?? "";
  const previewLimit = 500;
  const shouldTruncateContent = articlePlainContent.length > previewLimit;
  const shouldShowPaywall = !isProSubscriber;
  const canonicalUrl = buildCanonicalUrl(article ? article.path : "/archive");
  const pageTitle = article?.title ? `${article.title} | ${seoDefaults.siteName}` : seoDefaults.title;
  const descriptionSource = shouldShowPaywall ? articlePlainContent.substring(0, previewLimit) : articlePlainContent;
  const description = formatMetaDescription(descriptionSource);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={article ? "article" : "website"} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={seoDefaults.siteName} />
        <meta property="og:image" content={seoDefaults.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={seoDefaults.ogImage} />
        <meta name="keywords" content={(article?.tags || []).join(", ")} />
        {article?.date && <meta property="article:published_time" content={article.date} />}
        {article?.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>
      <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Back Button */}
        <Link to="/archive" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.archive}
        </Link>

        {/* 加载与错误状态 */}
        {isLoading && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 mb-8 text-muted-foreground">
            {t.highlightsLoading}
          </div>
        )}
        {isError && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-8 mb-8 text-muted-foreground">
            {t.highlightsError}
          </div>
        )}

        {/* Article Header */}
        <article className="bg-card rounded-2xl border border-border shadow-card p-8 mb-8">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{article?.date || ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {(article?.tags || []).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">{article?.title || ""}</h1>

          {/* Content with subscription check */}
          {article && (
            <div className="relative min-h-[300px]">
              <div
                className={`relative ${
                  shouldShowPaywall && shouldTruncateContent ? "max-h-[600px] overflow-hidden" : ""
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, [rehypeSanitize, richTextSanitizeSchema]]}
                  className="article-body prose prose-lg max-w-none text-foreground"
                >
                  {articleRichContent || articlePlainContent}
                </ReactMarkdown>
                {shouldShowPaywall && shouldTruncateContent && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent" />
                )}
              </div>

              {shouldShowPaywall && (
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-8 max-w-md shadow-strong pointer-events-auto">
                    <h3 className="text-2xl font-bold text-foreground mb-3">{t.subscribeToRead}</h3>
                    <p className="text-muted-foreground mb-6 whitespace-pre-line">{t.subscribeNow}</p>
                    <div className="flex flex-col gap-3">
                      <Button variant="cta" size="lg" asChild className="w-full">
                        <Link to="/pricing">{t.subscribeButton}</Link>
                      </Button>
                      {!user && (
                        <Button variant="outline" size="lg" asChild className="w-full">
                          <Link to="/auth">{t.alreadySubscribed}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 锁定提示 */}
          {article && shouldShowPaywall && (
            <div className="mt-8 flex items-center justify-center gap-3 py-6 border-t border-b border-border">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">
                {t.subscribeToReadFull}
              </span>
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t.relatedArticles}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  to={related.path}
                  className="bg-card rounded-xl border border-border p-6 hover:shadow-card transition-shadow"
                >
                  <h3 className="font-semibold text-foreground mb-2">{related.title}</h3>
                  <p className="text-sm text-muted-foreground">{related.date}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
