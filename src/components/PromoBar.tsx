import { X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PromoBar() {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useLanguage();

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="text-sm font-medium">
            {t.promoBar}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Close promo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
