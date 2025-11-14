import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, formatMetaDescription, seoDefaults } from "@/lib/seo";

const magicLinkSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
});

// 翻译 Supabase 错误信息
const translateAuthError = (errorMessage: string, t: any): string => {
  const lowerMessage = errorMessage.toLowerCase();
  
  // Rate limit errors
  if (lowerMessage.includes('security purposes') || 
      lowerMessage.includes('try again') || 
      lowerMessage.includes('rate limit')) {
    return t.errors.rateLimitError;
  }
  
  // Invalid email
  if (lowerMessage.includes('invalid') && lowerMessage.includes('email')) {
    return t.errors.invalidEmail;
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return t.errors.networkError;
  }
  
  // Default: return original message or unknown error
  return errorMessage || t.errors.unknownError;
};

export default function Auth() {
  const navigate = useNavigate();
  const { signInWithMagicLink, signInWithGoogle, user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const pageTitle = `${t.auth.title} | ${seoDefaults.siteName}`;
  const description = formatMetaDescription(t.auth.description);
  const canonicalUrl = buildCanonicalUrl("/auth");

  const magicLinkForm = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (window.top !== window.self) {
      try {
        (window.top as Window).location.href = window.location.href;
      } catch (_e) {
        window.open(window.location.href, "_blank", "noopener,noreferrer");
        // Note: This toast won't use t because useEffect runs before t is ready
        // But it's a rare edge case (iframe scenario)
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleMagicLink = async (values: z.infer<typeof magicLinkSchema>) => {
    setIsLoading(true);

    const { error } = await signInWithMagicLink(values.email);

    if (error) {
      const translatedError = translateAuthError(error.message, t);
      toast.error(translatedError);
    } else {
      setMagicLinkSent(true);
      toast.success(t.auth.magicLinkSent);
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsGoogleLoading(false);
    }
    // Note: User will be redirected to Google, so no need to setIsGoogleLoading(false)
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
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t.auth.title}</CardTitle>
          <CardDescription>
            {t.auth.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {magicLinkSent ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{t.auth.checkEmail}</h3>
                <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">
                  {t.auth.emailSentMessage}
                </p>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setMagicLinkSent(false)}
                    className="w-full"
                  >
                    {t.auth.resendLink}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t.auth.checkSpam}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Form {...magicLinkForm}>
              <form onSubmit={magicLinkForm.handleSubmit(handleMagicLink)} className="space-y-6 pt-2">
                <FormField
                  control={magicLinkForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t.auth.magicEmailTitle}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t.auth.emailPlaceholder}
                          className="h-11"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.auth.sending}
                    </>
                  ) : (
                    t.auth.sendMagicLink
                  )}
                </Button>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t.auth.benefit1}</span>
                  </div>
                  <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>{t.auth.benefit2}</span>
                  </div>
                  <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{t.auth.benefit3}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t.auth.orContinueWith}
                    </span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-11"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.auth.sending}
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      {t.auth.continueWithGoogle}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground text-center">
          {t.auth.termsText}
        </CardFooter>
      </Card>
      </div>
    </>
  );
}
