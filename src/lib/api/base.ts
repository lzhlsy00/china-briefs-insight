const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";

export const apiBaseUrl = (import.meta.env.VITE_NEWS_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
