import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BriefCard, { type BriefCardProps } from "@/components/BriefCard";
import { Search, Filter, Calendar as CalendarIcon } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsList, type PublicNewsItem } from "@/lib/api/news";
import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, formatMetaDescription, seoDefaults } from "@/lib/seo";
import TurndownService from "turndown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

// 辅助函数：去除 HTML 标签
const stripHtml = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// 辅助函数：检查是否有对应语言的翻译
const hasTranslation = (item: PublicNewsItem, language: Language): boolean => {
  return language === "ko" 
    ? !!(item.titleKo || item.translationKo)
    : !!(item.titleEn || item.translationEn);
};

// 辅助函数：获取对应语言的标题
const getTitle = (item: PublicNewsItem, language: Language): string => {
  const translation = language === "ko" ? item.titleKo : item.titleEn;
  const base = translation ?? item.title ?? item.link ?? "";
  return stripHtml(base).trim();
};

const turndownService = new TurndownService({ headingStyle: "atx" });

// 辅助函数：获取对应语言的内容
const getContent = (item: PublicNewsItem, language: Language): { plain: string; markdown: string } => {
  const translation = language === "ko" ? item.translationKo : item.translationEn;
  const base = translation ?? item.content ?? "";
  const content = (base ?? "").trim();
  const plain = stripHtml(content);
  const markdown = content.includes("<") ? turndownService.turndown(content) : content;
  return { plain, markdown };
};

// 辅助函数：提取标签
const extractTags = (category: string | null | undefined): string[] => {
  if (!category) return [];
  return category.split(/[,|/]/).map((s) => s.trim()).filter((s) => s.length > 0);
};

const getLocalizedCategory = (item: PublicNewsItem, preferKoreanCategory: boolean) => {
  if (preferKoreanCategory) {
    return item["category-ko"] ?? item.category ?? item["category-en"] ?? null;
  }
  return item["category-en"] ?? item.category ?? item["category-ko"] ?? null;
};

const normalizeCategoryId = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

// 辅助函数：格式化日期
const formatDate = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    return date.toISOString().split("T")[0];
  } catch {
    return isoDate;
  }
};

// 辅助函数：截断文本
// 辅助函数：获取推荐理由
const getRecommendation = (item: PublicNewsItem, language: Language) => {
  const reason = language === "ko" ? item.aiReasonKo : item.aiReasonEn;
  const value = (reason ?? "").trim();
  if (!value) {
    return null;
  }
  const markdown = value.includes("<") ? turndownService.turndown(value) : value;
  return markdown || null;
};

// 辅助函数：转换为 BriefCard 所需格式
const toBriefCardData = (
  item: PublicNewsItem,
  language: Language,
  preferKoreanCategory: boolean,
): BriefCardProps | null => {
  const slug = item.slug?.trim();
  if (!slug) {
    console.warn("Skipping news without slug", item.id);
    return null;
  }

  const content = getContent(item, language);
  const summary = content.markdown;
  const title = getTitle(item, language);
  const recommendation = getRecommendation(item, language);
  const categorySource = getLocalizedCategory(item, preferKoreanCategory);

  return {
    id: String(item.id),
    slug,
    title: title || summary,
    summary,
    recommendation,
    tags: extractTags(categorySource),
    date: formatDate(item.isoDate),
    isoDateValue: item.isoDate,
  };
};

export default function Archive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const { t, language } = useLanguage();
  const pageTitle = `${t.archive} | ${seoDefaults.siteName}`;
  const description = formatMetaDescription(t.upgradeProArchive.description);
  const canonicalUrl = buildCanonicalUrl("/archive");
  const preferKoreanCategory = language === "ko";

  // 从真实 API 获取数据
  const { data: newsData, isLoading } = useQuery({
    queryKey: ["news-archive", language],
    queryFn: () => fetchNewsList({ limit: 50, latest: true }),
  });

  // 处理和筛选数据
  const briefs = useMemo(() => {
    if (!newsData) return [];

    return newsData
      .filter((item) => hasTranslation(item, language))
      .map((item) => toBriefCardData(item, language, preferKoreanCategory))
      .filter((brief): brief is BriefCardProps => Boolean(brief));
  }, [newsData, language, preferKoreanCategory]);

  const filteredBriefs = useMemo(() => {
    return briefs.filter((brief) => {
      const matchesSearch = brief.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || brief.tags.some((tag) => normalizeCategoryId(tag) === selectedCategory);
      const isoDateOnly = (brief.isoDateValue || brief.date || "").slice(0, 10);
      const matchesStart = startDate ? isoDateOnly >= startDate : true;
      const matchesEnd = endDate ? isoDateOnly <= endDate : true;
      const matchesDateRange = !startDate && !endDate ? true : Boolean(isoDateOnly) && matchesStart && matchesEnd;
      return matchesSearch && matchesCategory && matchesDateRange;
    });
  }, [briefs, searchQuery, selectedCategory, startDate, endDate]);

  const categoryOptions = useMemo(() => {
    const entries = new Map<string, string>();
    briefs.forEach((brief) => {
      brief.tags.forEach((tag) => {
        if (!tag) return;
        const id = normalizeCategoryId(tag);
        if (!entries.has(id)) {
          entries.set(id, tag);
        }
      });
    });
    return [
      { id: "all", label: t.allCategories },
      ...Array.from(entries.entries()).map(([id, label]) => ({ id, label })),
    ];
  }, [briefs, t.allCategories]);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={seoDefaults.siteName} />
        <meta property="og:image" content={seoDefaults.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={seoDefaults.ogImage} />
      </Helmet>
      <div className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.archive}</h1>
          <p className="text-lg text-muted-foreground">
            {t.upgradeProArchive.description}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Range */}
            <Popover
              open={isDateRangeOpen}
              onOpenChange={(open) => {
                setIsDateRangeOpen(open);
                if (open) {
                  setPendingRange({
                    from: startDate ? new Date(startDate) : undefined,
                    to: endDate ? new Date(endDate) : undefined,
                  });
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start min-w-[220px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate && endDate
                    ? `${startDate} → ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : endDate
                        ? `Until ${endDate}`
                        : "Date Range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  numberOfMonths={2}
                  selected={pendingRange}
                  onSelect={(range) => setPendingRange(range)}
                />
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPendingRange(undefined);
                      setStartDate("");
                      setEndDate("");
                      setIsDateRangeOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const from = pendingRange?.from ? format(pendingRange.from, "yyyy-MM-dd") : "";
                      const to = pendingRange?.to ? format(pendingRange.to, "yyyy-MM-dd") : "";
                      setStartDate(from);
                      setEndDate(to);
                      setIsDateRangeOpen(false);
                    }}
                    disabled={!pendingRange?.from && !pendingRange?.to}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter button hidden for now */}
            <div className="hidden">
              <Button variant="outline" className="lg:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <Badge
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "secondary"}
                className="cursor-pointer hover:opacity-80 transition-opacity px-4 py-1.5"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${filteredBriefs.length} briefs found`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Loading news...</p>
          </div>
        )}

        {/* Brief List */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBriefs.map((brief) => (
              <BriefCard key={brief.slug} {...brief} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredBriefs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-4">No results found</p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setStartDate("");
              setEndDate("");
            }}>
              Reset Filters
            </Button>
          </div>
        )}

        {/* Load More */}
        {!isLoading && filteredBriefs.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More
            </Button>
          </div>
        )}

        {/* CTA for non-subscribers */}
        <div className="mt-16 bg-gradient-accent text-accent-foreground rounded-2xl p-8 text-center shadow-strong">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t.upgradeProArchive.title}</h2>
          <p className="text-lg opacity-90 mb-6">
            {t.upgradeProArchive.description}
          </p>
          <Button variant="cta" size="lg" asChild>
            <a href="/pricing">{t.upgradeProArchive.cta}</a>
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
