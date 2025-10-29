import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BriefCard from "@/components/BriefCard";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchHighlightedNews, type PublicNewsItem } from "@/lib/api/news";
import type { Language } from "@/lib/translations";

const formatDate = (isoDate: string, language: Language) => {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return isoDate;
    }

    const locale = language === "ko" ? "ko-KR" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
};

const extractTags = (category: string | null) => {
  if (!category) {
    return [] as string[];
  }

  return category
    .split(/[,|/]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const stripHtml = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const createSummary = (item: PublicNewsItem, language: Language) => {
  const translation = language === "ko" ? item.translationKo : item.translationEn;
  const fallbackTranslation = language === "ko" ? item.translationEn : item.translationKo;
  const base = translation ?? fallbackTranslation ?? item.content ?? "";
  return (base ?? "").trim();
};

const createTitle = (item: PublicNewsItem, language: Language) => {
  const translation = language === "ko" ? item.titleKo : item.titleEn;
  const fallbackTranslation = language === "ko" ? item.titleEn : item.titleKo;
  const base = translation ?? fallbackTranslation ?? item.title ?? "";
  return stripHtml(base).trim();
};

const hasTranslation = (item: PublicNewsItem, language: Language): boolean => {
  return language === "ko" 
    ? !!(item.titleKo || item.translationKo)
    : !!(item.titleEn || item.translationEn);
};

const createRecommendation = (item: PublicNewsItem, language: Language) => {
  const reason = language === "ko" ? item.aiReasonKo : item.aiReasonEn;
  return reason ? reason.trim() : null;
};

const toBriefCardData = (item: PublicNewsItem, language: Language) => {
  const summary = createSummary(item, language);
  const recommendation = createRecommendation(item, language);
  const titleCandidate = createTitle(item, language);

  return {
    id: String(item.id),
    title: titleCandidate || summary,
    summary,
    recommendation,
    tags: extractTags(item.category),
    date: formatDate(item.isoDate, language),
  };
};

const highlightSkeletons = Array.from({ length: 3 }).map((_, index) => (
  <div
    key={`highlight-skeleton-${index}`}
    className="border border-border rounded-2xl p-6 bg-card animate-pulse space-y-4"
  >
    <div className="h-4 bg-muted rounded w-3/4" />
    <div className="h-4 bg-muted rounded w-full" />
    <div className="h-4 bg-muted rounded w-5/6" />
    <div className="h-3 bg-muted rounded w-2/3" />
    <div className="flex gap-2">
      <div className="h-6 w-16 bg-muted rounded-full" />
      <div className="h-6 w-20 bg-muted rounded-full" />
    </div>
  </div>
));

export default function Home() {
  const { t, language } = useLanguage();

  const {
    data: highlightedNews,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["todaysHighlights"],
    queryFn: fetchHighlightedNews,
  });

  const highlights = useMemo(() => {
    if (!highlightedNews) {
      return [];
    }

    return highlightedNews
      .filter((item) => hasTranslation(item, language))
      .slice(0, 3)
      .map((item) => toBriefCardData(item, language));
  }, [highlightedNews, language]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-hero pt-20 pb-32 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <Badge variant="secondary" className="text-sm">
              ✅ {t.hero.badge1}
            </Badge>
            <Badge className="bg-success text-success-foreground text-sm">
              🎉 {t.hero.badge3}
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t.hero.title}
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="cta" size="xl" asChild>
              <Link to="/pricing">
                {t.hero.ctaPrimary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>{t.trustBadges.trial}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>{t.trustBadges.cancelAnytime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Highlights */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.todaysHighlights}</h2>
            <p className="text-lg text-muted-foreground">{t.hero.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              <>
                <div className="col-span-full text-center text-sm text-muted-foreground">
                  {t.highlightsLoading}
                </div>
                {highlightSkeletons}
              </>
            ) : isError ? (
              <div className="col-span-full text-center text-sm text-muted-foreground">
                {t.highlightsError}
              </div>
            ) : highlights.length > 0 ? (
              highlights.map((brief) => <BriefCard key={brief.id} {...brief} />)
            ) : (
              <div className="col-span-full text-center text-sm text-muted-foreground">
                {t.highlightsEmpty}
              </div>
            )}
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link to="/archive">
                {t.viewAll}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.howItWorks.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.howItWorks.step1.title}</h3>
              <p className="text-muted-foreground">
                {t.howItWorks.step1.description}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.howItWorks.step2.title}</h3>
              <p className="text-muted-foreground">
                {t.howItWorks.step2.description}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.howItWorks.step3.title}</h3>
              <p className="text-muted-foreground">{t.howItWorks.step3.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-8 md:p-12 text-center shadow-strong">
            <Badge className="bg-success text-success-foreground mb-4">LIMITED OFFER</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.pricingTeaser.title}</h2>
            <p className="text-lg opacity-90 mb-6">
              {t.pricingTeaser.feature1}, {t.pricingTeaser.feature2}, {t.pricingTeaser.feature3}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="cta" size="xl" asChild>
                <Link to="/pricing">
                  {t.startTrial}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.faq.title}</h2>
          </div>

          <div className="space-y-4">
            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">
                {t.faq.q1}
              </summary>
              <p className="mt-4 text-muted-foreground">
                {t.faq.a1}
              </p>
            </details>

            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">{t.faq.q2}</summary>
              <p className="mt-4 text-muted-foreground">
                {t.faq.a2}
              </p>
            </details>

            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">{t.faq.q3}</summary>
              <p className="mt-4 text-muted-foreground">
                {t.faq.a3}
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
