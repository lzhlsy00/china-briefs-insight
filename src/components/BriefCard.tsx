import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import MarkdownText from "@/components/MarkdownText";

export interface BriefCardProps {
  id: string;
  slug: string;
  title: string;
  summary: string;
  recommendation?: string | null;
  tags?: string[];
  date: string;
}

export default function BriefCard({
  id,
  slug,
  title,
  summary,
  recommendation,
  tags = [],
  date,
}: BriefCardProps) {
  const { t } = useLanguage();

  return (
    <Link to={`/article/${slug}`}>
      <Card className="group hover:shadow-card-hover transition-all duration-300 border-border bg-card rounded-2xl overflow-hidden cursor-pointer">
        <CardHeader className="pb-3">
          <div className="mb-2">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={date}>{date}</time>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <MarkdownText
            content={summary}
            className="text-sm text-muted-foreground leading-relaxed line-clamp-4 [&_*]:line-clamp-none [&_*]:text-muted-foreground"
          />

          {recommendation ? (
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <div className="text-xs font-medium text-accent mb-1">{t.whyRecommend}</div>
              <MarkdownText
                content={recommendation}
                className="text-sm text-foreground/90 leading-relaxed line-clamp-4 [&_*]:line-clamp-none"
              />
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="pt-2">
          <div className="group/link flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover transition-colors">
            {t.readBrief}
            <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
