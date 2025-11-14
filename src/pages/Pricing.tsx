import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, formatMetaDescription, seoDefaults } from "@/lib/seo";

export default function Pricing() {
  const { language, t, countryCode } = useLanguage();
  const { user, session, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const isKoreanRegion = countryCode === "KR";
  const pageTitle = `${t.pricingTitle} | ${seoDefaults.siteName}`;
  const description = formatMetaDescription(t.pricingSubtitle);
  const canonicalUrl = buildCanonicalUrl("/pricing");

  const features = [
    t.features.dailyBriefs,
    t.features.fullArchive,
    t.features.insights,
    t.features.saveBookmark,
    t.features.prioritySupport,
  ];

  const price = isKoreanRegion ? "₩5,900" : "$3.99";
  const originalPrice = isKoreanRegion ? "₩11,800" : "$7.98";

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("결제가 완료되었습니다! 구독 상태를 확인 중입니다...");
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
      navigate("/pricing", { replace: true });
    } else if (canceled === "true") {
      toast.error("결제가 취소되었습니다.");
      navigate("/pricing", { replace: true });
    }
  }, [searchParams, refreshSubscription, navigate]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          region: isKoreanRegion ? "KR" : "DEFAULT",
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "구독 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };




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
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-success text-success-foreground">{t.promoBar}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.pricingTitle}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.pricingSubtitle}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-lg mx-auto mb-16">
          <Card className="border-accent bg-card rounded-2xl shadow-strong relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-accent-foreground px-4 py-1">RECOMMENDED</Badge>
            </div>

            <CardHeader className="text-center pb-6 pt-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t.pro}</h2>
              <div className="mb-2">
                <span className="text-4xl font-bold text-foreground">{price}</span>
                <span className="text-muted-foreground ml-2">{t.perMonth}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground line-through">{originalPrice}</span>
                <Badge className="bg-success text-success-foreground">{t.discount}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{t.coffeePrice}</p>
              <p className="text-xs text-muted-foreground mt-2">{t.lifetimeDiscount}</p>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button 
                variant="cta" 
                size="lg" 
                className="w-full" 
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading 
                  ? (language === "ko" ? "처리 중..." : "Processing...") 
                  : subscription.subscribed 
                  ? t.subscriptionDialog.renew 
                  : t.startTrial}
              </Button>
              {subscription.subscribed && (
                <div className="text-sm text-center text-muted-foreground">
                  <Badge variant="outline" className="bg-success/10 text-success">
                    {t.userMenu.proSubscribed}
                  </Badge>
                  {subscription.subscriptionEnd && (
                    <p className="mt-2">
                      {(language === "ko" ? "다음 결제일:" : "Next billing date:") + " " + new Date(subscription.subscriptionEnd).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US")}
                    </p>
                  )}
                </div>
              )}

            </CardFooter>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>{t.trustBadges.trial}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>{t.trustBadges.cancelAnytime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>{t.trustBadges.securePayment}</span>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">{t.testimonials.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-muted/30 border-border rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-accent">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4">
                  "{t.testimonials.testimonial1.text}"
                </p>
                <p className="text-xs text-muted-foreground">{t.testimonials.testimonial1.author}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-accent">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4">
                  "{t.testimonials.testimonial2.text}"
                </p>
                <p className="text-xs text-muted-foreground">{t.testimonials.testimonial2.author}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-accent">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4">
                  "{t.testimonials.testimonial3.text}"
                </p>
                <p className="text-xs text-muted-foreground">{t.testimonials.testimonial3.author}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">{t.faqPricing.title}</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">
                {t.faqPricing.q1}
              </summary>
              <p className="mt-4 text-muted-foreground">
                {t.faqPricing.a1}
              </p>
            </details>

            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">
                {t.faqPricing.q2}
              </summary>
              <p className="mt-4 text-muted-foreground">
                {t.faqPricing.a2}
              </p>
            </details>

            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">{t.faqPricing.q3}</summary>
              <p className="mt-4 text-muted-foreground">
                {t.faqPricing.a3}
              </p>
            </details>

            <details className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <summary className="font-semibold text-foreground cursor-pointer">
                {t.faqPricing.q4}
              </summary>
              <p className="mt-4 text-muted-foreground">
                {t.faqPricing.a4}
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
