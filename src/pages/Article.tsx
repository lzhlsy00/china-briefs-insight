import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Tag, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/translations";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsById, fetchNewsList, type PublicNewsItem } from "@/lib/api/news";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const stripHtml = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export default function Article() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { user, subscription } = useAuth();
  const isProSubscriber = subscription.subscribed;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["article", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      return fetchNewsById(id);
    },
  });

  // 获取相关文章（优先基于分类，否则获取最新文章）
  const { data: relatedNewsData } = useQuery({
    queryKey: ["relatedNews", data?.category, id],
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

    const titleCandidate = language === "ko" ? data.titleKo ?? data.titleEn : data.titleEn ?? data.titleKo;
    const contentCandidate = language === "ko" ? data.translationKo ?? data.translationEn ?? data.content : data.translationEn ?? data.translationKo ?? data.content;
    const tags = (data.category ?? "")
      .split(/[,|/]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const rawContent = (contentCandidate || "").trim();
    let normalizedMarkdown = rawContent.replace(/^(#+)(?![\s#])/gm, '$1 ');
    normalizedMarkdown = normalizedMarkdown.replace(new RegExp('^(#{1,6}\\s[^\\n]+)(?!\\n)', 'gm'), '$1\n');
    const plainContent = stripHtml(normalizedMarkdown || "").trim();

    return {
      id: String(data.id),
      title: stripHtml(titleCandidate || data.title || data.link || "").trim(),
      date: data.isoDate,
      tags,
      content: plainContent,
      contentMarkdown: normalizedMarkdown,
      recommendation: null as string | null,
    };
  }, [data, language]);

  // 处理相关文章：过滤当前文章，必须同时有韩文和英文标题，限制数量
  const relatedArticles = useMemo(() => {
    if (!relatedNewsData || !data) return [];

    // 检查是否同时有韩文和英文标题
    const hasBothTitles = (item: PublicNewsItem) => {
      return Boolean(item.titleKo && item.titleEn);
    };

    const getTitle = (item: PublicNewsItem, lang: Language) => {
      if (lang === "ko") {
        return stripHtml(item.titleKo || item.title).trim();
      } else {
        return stripHtml(item.titleEn || item.title).trim();
      }
    };

    return relatedNewsData
      .filter((item) => item.id !== data.id) // 排除当前文章
      .filter((item) => hasBothTitles(item)) // 必须同时有韩文和英文标题
      .slice(0, 4) // 限制4篇
      .map((item) => ({
        id: item.id,
        title: getTitle(item, language),
        date: item.isoDate,
      }));
  }, [relatedNewsData, data, language]);

  const articlePlainContent = article?.content ?? "";
  const articleMarkdownContent = article?.contentMarkdown ?? "";
  const previewPlainContent = articlePlainContent.substring(0, 500);
  const previewMarkdownContent = articleMarkdownContent.substring(0, 500);
  const shouldTruncateContent = articlePlainContent.length > 500 || articleMarkdownContent.length > 500;
  const shouldShowPaywall = !isProSubscriber;

  return (
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
              {isProSubscriber ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-lg max-w-none text-foreground relative"
                >
                  {articleMarkdownContent}
                </ReactMarkdown>
              ) : (
                <>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-lg max-w-none text-foreground relative"
                  >
                    {previewMarkdownContent || previewPlainContent}
                  </ReactMarkdown>
                  {shouldTruncateContent && (
                    <p className="text-muted-foreground mt-2">...</p>
                  )}
                </>
              )}

              {shouldShowPaywall && (
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-8 max-w-md shadow-strong pointer-events-auto">
                    <h3 className="text-2xl font-bold text-foreground mb-3">{t.subscribeToRead}</h3>
                    <p className="text-muted-foreground mb-6 whitespace-pre-line">{t.subscribeNow}</p>
                    <div className="flex flex-col gap-3">
                      <Button variant="cta" size="lg" asChild className="w-full">
                        <Link to="/pricing">{t.subscribeButton}</Link>
                      </Button>
                      {/* Only show "Sign In" button if user is NOT logged in */}
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
                {language === "ko" ? "구독 후 전체 내용을 확인하세요" : "Subscribe to read the full article"}
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
                  key={related.id}
                  to={`/article/${related.id}`}
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
  );
}
