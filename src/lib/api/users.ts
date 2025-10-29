import { apiBaseUrl } from "./base";

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  message: string;
};

type EnsureUserProfileResult = {
  user: {
    id: string;
    email: string;
    subscription_status: string | null;
    created_at: string | null;
  };
  isNewUser: boolean;
};

type EnsureUserProfileResponse = ApiSuccess<EnsureUserProfileResult> | ApiError;

type EnsureUserProfilePayload = {
  id: string;
  email: string;
};

export type UserProfileDetails = {
  id: string;
  email: string | null;
  subscription_status: string | null;
  created_at: string | null;
  subscribed: string | null;
  latest_renewal: string | null;
  transactions: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
};

type UserProfileDetailsResponse = ApiSuccess<{ user: UserProfileDetails }> | ApiError;

export const ensureUserProfile = async ({ id, email }: EnsureUserProfilePayload): Promise<EnsureUserProfileResult> => {
  const response = await fetch(`${apiBaseUrl}/public/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, userId: id }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync user profile (HTTP ${response.status})`);
  }

  const result = (await response.json()) as EnsureUserProfileResponse;

  if (!result.success) {
    throw new Error(result.message || "Failed to sync user profile");
  }

  return result.data;
};

export const fetchUserProfileDetails = async (id: string): Promise<UserProfileDetails> => {
  const response = await fetch(`${apiBaseUrl}/public/users/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to load user profile (HTTP ${response.status})`);
  }

  const result = (await response.json()) as UserProfileDetailsResponse;

  if (!result.success) {
    throw new Error(result.message || "Failed to load user profile");
  }

  return result.data.user;
};

export const cancelSubscription = async (id: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/public/subscription/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId: id }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({ message: "" }));
    const message = typeof result?.message === "string" ? result.message : "Failed to cancel subscription";
    throw new Error(message);
  }
};
