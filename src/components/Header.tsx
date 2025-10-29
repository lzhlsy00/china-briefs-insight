import { Button } from "@/components/ui/button";
import { Menu, Globe, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ManageSubscriptionDialog } from "@/components/account/ManageSubscriptionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, subscription } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLanguage(language === "ko" ? "en" : "ko");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { label: t.home, path: "/" },
    { label: t.archive, path: "/archive" },
    { label: t.pricing, path: "/pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="font-bold text-xl text-primary">BiteChina</div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="hidden sm:flex"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
            <span className="ml-1 text-xs">{language.toUpperCase()}</span>
          </Button>

          {user ? (
            <>
              {/* Subscribe Button - Always show */}
              <Button 
                variant="cta" 
                size="sm" 
                className="hidden sm:flex"
                asChild
              >
                <Link to="/pricing">{subscription.subscribed ? t.pricing : t.startFreeTrial}</Link>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
                    <User className="h-4 w-4" />
                    {user.email?.split("@")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t.userMenu.myAccount}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {subscription.subscribed && (
                    <>
                      <DropdownMenuItem disabled>
                        <span className="text-success">{t.userMenu.proSubscribed}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setManageDialogOpen(true)}>
                    {t.userMenu.manageSubscription}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.userMenu.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Sign In */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:flex"
                onClick={() => navigate("/auth")}
              >
                {t.signIn}
              </Button>

              {/* CTA Button */}
              <Button 
                variant="cta" 
                size="sm" 
                className="hidden sm:flex"
                asChild
              >
                <Link to="/pricing">{t.startFreeTrial}</Link>
              </Button>
            </>
          )}

          {/* Mobile Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="md:hidden"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ManageSubscriptionDialog open={manageDialogOpen} onOpenChange={setManageDialogOpen} />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto flex flex-col gap-2 p-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-2">
              {user ? (
                <>
                  {/* Subscribe Button - Always show */}
                  <Button 
                    variant="cta" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      navigate("/pricing");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {subscription.subscribed ? t.pricing : t.startFreeTrial}
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setManageDialogOpen(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {t.userMenu.manageSubscription}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      {t.userMenu.logout}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      navigate("/auth");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t.signIn}
                  </Button>
                  <Button 
                    variant="cta" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      navigate("/pricing");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t.startFreeTrial}
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
