import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Star, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

export default function DataCenter() {
  const { t } = useLanguage();

  const reports = [
    {
      id: "1",
      title: "2025 China AI Market Outlook Report",
      description: "60-page report analyzing major China AI industry trends and investment opportunities",
      price: 49000,
      proPrice: 34300,
      category: "AI",
      featured: true,
    },
    {
      id: "2",
      title: "China EV Industry Value Chain Analysis",
      description: "In-depth analysis of China EV ecosystem from batteries to autonomous driving",
      price: 39000,
      proPrice: 27300,
      category: "EV",
      featured: false,
    },
    {
      id: "3",
      title: "2024 Chinese Brand Market Entry Case Studies",
      description: "Analysis of 20 Chinese brand cases entering various markets",
      price: 29000,
      proPrice: 20300,
      category: "Brand",
      featured: false,
    },
    {
      id: "4",
      title: "Hong Kong IPO Market Investment Guide",
      description: "Notable 2025 Hong Kong listings and investment strategies",
      price: 45000,
      proPrice: 31500,
      category: "Finance",
      featured: true,
    },
    {
      id: "5",
      title: "China Semiconductor Rise: Current Status & Outlook",
      description: "Present and future of China's semiconductor industry amid US-China tensions",
      price: 55000,
      proPrice: 38500,
      category: "Semiconductor",
      featured: false,
    },
    {
      id: "6",
      title: "China Robotics Startup Ecosystem",
      description: "Key companies and technology trends in industrial and service robots",
      price: 35000,
      proPrice: 24500,
      category: "Robotics",
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-accent text-accent-foreground">Premium Reports</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.dataCenter}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.upgradeProDataCenter.description}
          </p>
        </div>

        {/* Featured Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Star className="h-6 w-6 text-accent" />
            Featured Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports
              .filter((report) => report.featured)
              .map((report) => (
                <Link key={report.id} to={`/article/${report.id}`}>
                  <Card className="group hover:shadow-card-hover transition-all duration-300 border-accent/20 bg-card rounded-2xl h-full"
                  >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <Badge variant="secondary">{report.category}</Badge>
                      <Badge className="bg-success text-success-foreground">{t.proDiscount}</Badge>
                    </div>
                    <h3 className="font-bold text-xl text-foreground group-hover:text-accent transition-colors">
                      {report.title}
                    </h3>
                  </CardHeader>

                  <CardContent>
                    <p className="text-muted-foreground mb-4">{report.description}</p>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">₩{report.proPrice.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground line-through">₩{report.price.toLocaleString()}</span>
                      <span className="text-xs text-success font-medium">(Pro only)</span>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <Button variant="cta" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      {t.buyNow}
                    </Button>
                    <Button variant="outline">Preview</Button>
                  </CardFooter>
                </Card>
                </Link>
              ))}
          </div>
        </div>

        {/* All Reports */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            All Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports
              .filter((report) => !report.featured)
              .map((report) => (
                <Link key={report.id} to={`/article/${report.id}`}>
                  <Card className="group hover:shadow-card-hover transition-all duration-300 border-border bg-card rounded-2xl h-full"
                  >
                  <CardHeader>
                    <Badge variant="secondary" className="mb-2 w-fit">
                      {report.category}
                    </Badge>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2">
                      {report.title}
                    </h3>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{report.description}</p>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-foreground">
                          ₩{report.proPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">(Pro)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Regular: ₩{report.price.toLocaleString()}</div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2">
                    <Button variant="default" className="w-full">
                      {t.buyNow}
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full">
                      Learn More
                    </Button>
                  </CardFooter>
                </Card>
                </Link>
              ))}
          </div>
        </div>

        {/* Pro CTA */}
        <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-8 md:p-12 text-center shadow-strong">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.upgradeProDataCenter.title}</h2>
          <p className="text-lg opacity-90 mb-6">
            {t.upgradeProDataCenter.description}
          </p>
          <Button variant="cta" size="xl" asChild>
            <a href="/pricing">{t.upgradeProDataCenter.cta}</a>
          </Button>
          <p className="text-sm opacity-75 mt-4">{t.trustBadges.trial} · {t.trustBadges.cancelAnytime}</p>
        </div>
      </div>
    </div>
  );
}
