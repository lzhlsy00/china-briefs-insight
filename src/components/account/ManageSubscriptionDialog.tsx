import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldOff } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cancelSubscription, fetchUserProfileDetails, UserProfileDetails } from "@/lib/api/users";
import { toast } from "sonner";

type ManageSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatDate = (value: string | null, locale: string) => {
  if (!value) {
    return null;
  }

  try {
    return new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    console.error("Failed to format date:", error);
    return value;
  }
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right text-foreground whitespace-pre-wrap">{value}</span>
  </div>
);

export function ManageSubscriptionDialog({ open, onOpenChange }: ManageSubscriptionDialogProps) {
  const { language, t } = useLanguage();
  const { user, subscription, refreshSubscription } = useAuth();

  const [profile, setProfile] = useState<UserProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const locale = language === "ko" ? "ko-KR" : "en-US";
  const isSubscribedFromProfile = profile?.subscription_status === "pro" || (profile?.current_period_end ? Date.parse(profile.current_period_end) > Date.now() : false);
  const isSubscribed = subscription.subscribed || isSubscribedFromProfile;

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const details = await fetchUserProfileDetails(user.id);
      setProfile(details);
    } catch (error) {
      console.error("Failed to load subscription profile:", error);
      setErrorMessage(t.subscriptionDialog.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [user, t.subscriptionDialog.loadError]);

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open, loadProfile]);

  const handleCancelSubscription = useCallback(async () => {
    if (!user) {
      return;
    }

    setCancelLoading(true);
    try {
      await cancelSubscription(user.id);

      toast.success(t.subscriptionDialog.cancelSuccess);
      await Promise.all([loadProfile(), refreshSubscription()]);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      const message = error instanceof Error ? error.message : t.subscriptionDialog.cancelError;
      toast.error(message);
    } finally {
      setCancelLoading(false);
      setConfirmOpen(false);
    }
  }, [user, loadProfile, refreshSubscription, t.subscriptionDialog.cancelError, t.subscriptionDialog.cancelSuccess]);

  const handleRefresh = () => {
    loadProfile();
  };

  const statusText = useMemo(() => {
    const status = profile?.subscription_status;

    if (!status) {
      return t.subscriptionDialog.statusFree;
    }

    if (status === "pro") {
      return t.subscriptionDialog.statusActive;
    }

    if (status === "canceled") {
      return t.subscriptionDialog.statusCanceled;
    }

    if (status === "past_due") {
      return t.subscriptionDialog.statusPastDue;
    }

    return t.subscriptionDialog.statusFree;
  }, [profile?.subscription_status, t.subscriptionDialog.statusActive, t.subscriptionDialog.statusCanceled, t.subscriptionDialog.statusFree, t.subscriptionDialog.statusPastDue]);

  const infoStatusBadge = useMemo(() => {
    if (isSubscribed) {
      return (
        <Badge className="bg-success text-success-foreground">
          {t.userMenu.proSubscribed}
        </Badge>
      );
    }

    if (profile?.subscription_status === "canceled") {
      return (
        <Badge variant="outline" className="text-destructive">
          {t.subscriptionDialog.statusCanceled}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t.subscriptionDialog.statusFree}
      </Badge>
    );
  }, [isSubscribed, profile?.subscription_status, t.subscriptionDialog.statusCanceled, t.subscriptionDialog.statusFree, t.userMenu.proSubscribed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.subscriptionDialog.title}</DialogTitle>
          <DialogDescription>
            {isSubscribed ? t.subscriptionDialog.description : t.subscriptionDialog.inactiveDescription}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.subscriptionDialog.loading}
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t.subscriptionDialog.statusLabel}</span>
              <div className="flex items-center gap-2">
                {infoStatusBadge}
                <span className="text-sm font-medium text-muted-foreground">{statusText}</span>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow
                label={t.subscriptionDialog.emailLabel}
                value={profile?.email ?? user?.email ?? t.subscriptionDialog.noData}
              />
              <InfoRow
                label={t.subscriptionDialog.firstPayment}
                value={formatDate(profile?.subscribed, locale) ?? t.subscriptionDialog.noData}
              />
              <InfoRow
                label={t.subscriptionDialog.periodStart}
                value={formatDate(profile?.current_period_start, locale) ?? t.subscriptionDialog.noData}
              />
              <InfoRow
                label={t.subscriptionDialog.periodEnd}
                value={formatDate(profile?.current_period_end, locale) ?? t.subscriptionDialog.noData}
              />
              <InfoRow
                label={t.subscriptionDialog.latestRenewal}
                value={formatDate(profile?.latest_renewal, locale) ?? t.subscriptionDialog.noData}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              {t.subscriptionDialog.renewHint}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.subscriptionDialog.refresh}
          </Button>
          {isSubscribed && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancelLoading}
                    className="w-full sm:w-auto text-destructive hover:bg-destructive/10"
                  >
                    {cancelLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.subscriptionDialog.loading}
                      </>
                    ) : (
                      <>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        {t.subscriptionDialog.cancel}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.subscriptionDialog.cancelConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.subscriptionDialog.cancelConfirmDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelLoading}>
                      {t.subscriptionDialog.cancelConfirmDismiss}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t.subscriptionDialog.cancelConfirmAction}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
