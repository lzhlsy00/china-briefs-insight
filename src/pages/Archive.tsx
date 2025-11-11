import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BriefCard, { type BriefCardProps } from "@/components/BriefCard";
import { Search, Filter, Calendar } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsList, type PublicNewsItem } from "@/lib/api/news";

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

// 辅助函数：获取对应语言的内容
const getContent = (item: PublicNewsItem, language: Language): string => {
  const translation = language === "ko" ? item.translationKo : item.translationEn;
  const base = translation ?? item.content ?? "";
  return (base ?? "").trim();
};

// 辅助函数：提取标签
const extractTags = (category: string | null | undefined): string[] => {
  if (!category) return [];
  return category.split(/[,|/]/).map((s) => s.trim()).filter((s) => s.length > 0);
};

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
  return reason ? reason.trim() : null;
};

// 辅助函数：转换为 BriefCard 所需格式
const toBriefCardData = (item: PublicNewsItem, language: Language): BriefCardProps | null => {
  const slug = item.slug?.trim();
  if (!slug) {
    console.warn("Skipping news without slug", item.id);
    return null;
  }

  const content = getContent(item, language);
  const summary = content;
  const title = getTitle(item, language);
  const recommendation = getRecommendation(item, language);

  return {
    id: String(item.id),
    slug,
    title: title || summary,
    summary,
    recommendation,
    tags: extractTags(item.category),
    date: formatDate(item.isoDate),
  };
};

export default function Archive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { t, language } = useLanguage();

  const categories = [
    { id: "all", label: t.allCategories },
    { id: "ai", label: t.categories.ai },
    { id: "brand", label: t.categories.brand },
    { id: "finance", label: t.categories.finance },
    { id: "ipo", label: t.categories.ipo },
    { id: "semiconductor", label: t.categories.semiconductor },
    { id: "ev", label: t.categories.ev },
  ];

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
      .map((item) => toBriefCardData(item, language))
      .filter((brief): brief is BriefCardProps => Boolean(brief));
  }, [newsData, language]);

  const filteredBriefs = useMemo(() => {
    return briefs.filter((brief) => {
      const matchesSearch = brief.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || brief.tags.some((tag) => tag.toLowerCase() === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [briefs, searchQuery, selectedCategory]);

  return (
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
            <Button variant="outline" className="lg:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>

            {/* Filter */}
            <Button variant="outline" className="lg:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
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
  );
}
