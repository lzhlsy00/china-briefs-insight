import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  countryCode: string | null;
  setLanguage: (lang: Language) => void;
  t: typeof translations.ko;
}

interface IpApiResponse {
  country_code?: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const userSelectedLanguage = useRef(false);

  const setLanguage = (lang: Language) => {
    userSelectedLanguage.current = true;
    setLanguageState(lang);
  };

  useEffect(() => {
    let isActive = true;

    const detectLanguage = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) {
          return;
        }
        const data: IpApiResponse = await response.json();
        const detectedCountry = data?.country_code?.toUpperCase() ?? null;
        if (!isActive) {
          return;
        }
        setCountryCode(detectedCountry);
        if (!userSelectedLanguage.current) {
          setLanguageState(detectedCountry === "KR" ? "ko" : "en");
        }
      } catch (_error) {
        if (isActive) {
          setCountryCode(null);
        }
        // Ignore network failures and keep the English default.
      }
    };

    if (typeof window !== "undefined") {
      detectLanguage();
    }

    return () => {
      isActive = false;
    };
  }, []);

  const value = {
    language,
    countryCode,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
