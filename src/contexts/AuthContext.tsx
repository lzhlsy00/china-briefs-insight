import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ensureUserProfile } from "@/lib/api/users";

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscription: SubscriptionStatus;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const ensuredUserIdRef = useRef<string | null>(null);

  const ensureUserProfileIfNeeded = async (supabaseUser: User | null | undefined) => {
    if (!supabaseUser) {
      return;
    }

    const email = supabaseUser.email?.trim().toLowerCase();
    if (!email) {
      return;
    }

    if (ensuredUserIdRef.current === supabaseUser.id) {
      return;
    }

    try {
      await ensureUserProfile({ id: supabaseUser.id, email });
      ensuredUserIdRef.current = supabaseUser.id;
    } catch (error) {
      console.error("Failed to ensure user profile:", error);
    }
  };

  const checkSubscription = async (userSession: Session | null) => {
    if (!userSession) {
      setSubscription({ subscribed: false, productId: null, subscriptionEnd: null });
      return;
    }

    await ensureUserProfileIfNeeded(userSession.user);

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      if (error) throw error;

      setSubscription({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      // Set default unsubscribed state on error (e.g., Stripe not configured)
      setSubscription({ subscribed: false, productId: null, subscriptionEnd: null });
    }
  };

  const refreshSubscription = async () => {
    await checkSubscription(session);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Defer subscription check with setTimeout
        if (currentSession?.user) {
          ensureUserProfileIfNeeded(currentSession.user);
          setTimeout(() => {
            checkSubscription(currentSession);
          }, 0);
        } else {
          setSubscription({ subscribed: false, productId: null, subscriptionEnd: null });
        }
      }
    );

    // Handle OAuth/Magic Link callback when redirected back
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error_description = url.searchParams.get('error_description');
        
        // Handle errors in URL
        if (error_description) {
          console.error("Auth error:", error_description);
          toast.error(t.errors.authProcessError);
          window.history.replaceState({}, document.title, url.origin + url.pathname);
          return;
        }

        // Handle OAuth PKCE flow (code + state) OR Magic Link (just code)
        if (code) {
          setIsLoading(true);
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            console.error("Session exchange error:", error);
            toast.error(t.errors.authProcessError);
          } else if (data?.session) {
            // Clean URL (remove query parameters)
            window.history.replaceState({}, document.title, url.origin + url.pathname);
            ensureUserProfileIfNeeded(data.session.user);
            // Don't show success toast here - user is being redirected
            setTimeout(() => {
              checkSubscription(data.session);
            }, 0);
          }
          
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        toast.error(t.errors.authProcessError);
        setIsLoading(false);
      }
    };

    handleAuthCallback();

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession) {
        ensureUserProfileIfNeeded(currentSession.user);
        checkSubscription(currentSession);
      }
      setIsLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Toast handled by caller
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    // Toast handled by caller
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      toast.error(error.message || t.errors.googleAuthError);
      return { error };
    }

    // Redirect at top-level (outside iframe). Fallback to new tab if blocked.
    if (data?.url) {
      try {
        if (window.top) {
          (window.top as Window).location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } catch (_e) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    }

    return { error: null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    // 不在这里显示 toast，由调用者根据语言显示
    return { error };
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase (scope: 'global' ensures all sessions are cleared)
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local state immediately
      setSubscription({ subscribed: false, productId: null, subscriptionEnd: null });
      setUser(null);
      setSession(null);
      ensuredUserIdRef.current = null;
      
      // Clear any lingering localStorage/sessionStorage items
      if (typeof window !== 'undefined') {
        // Clear Supabase-specific items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Don't show success toast - user will be redirected
      
      // Force reload to home page (ensures complete state reset)
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error(t.errors.logoutError);
      // Even on error, try to clear local state and redirect
      setUser(null);
      setSession(null);
      ensuredUserIdRef.current = null;
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  };

  const value = {
    user,
    session,
    subscription,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    refreshSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
