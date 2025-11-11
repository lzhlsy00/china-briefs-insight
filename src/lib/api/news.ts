import { apiBaseUrl } from "./base";

export interface PublicNewsItem {
  id: number;
  slug: string | null;
  title: string;
  isoDate: string;
  link: string;
  content: string | null;
  aiWorth: boolean | null;
  aiReasonEn: string | null;
  aiReasonKo: string | null;
  translationKo: string | null;
  translationEn: string | null;
  titleKo: string | null;
  titleEn: string | null;
  category: string | null;
}

export interface PublicNewsPagination {
  current: number;
  total: number;
  count: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiError {
  success: false;
  message: string;
}

type PublicNewsListResponse = ApiSuccess<{ news: PublicNewsItem[]; pagination: PublicNewsPagination }> | ApiError;

type PublicNewsDetailResponse = ApiSuccess<PublicNewsItem> | ApiError;

type PublicNewsQueryParams = {
  page?: number;
  limit?: number;
  category?: string;
  hot?: boolean;
  latest?: boolean;
};

const buildQueryString = (params: PublicNewsQueryParams = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === "boolean") {
      searchParams.append(key, value ? "true" : "false");
      return;
    }

    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const requestPublicNews = async (params?: PublicNewsQueryParams) => {
  const query = buildQueryString(params);
  const response = await fetch(`${apiBaseUrl}/public/news${query}`);

  if (!response.ok) {
    throw new Error(`Failed to load highlights (HTTP ${response.status})`);
  }

  const data = (await response.json()) as PublicNewsListResponse;

  if (!data.success) {
    throw new Error(data.message || "Failed to load highlights");
  }

  return data.data;
};

export const fetchHighlightedNews = async () => {
  // 获取更多数据以确保有足够的翻译内容可供筛选
  const { news } = await requestPublicNews({ limit: 10, latest: true });
  return news;
};

export const fetchNewsList = async (params?: PublicNewsQueryParams) => {
  const { news } = await requestPublicNews(params);
  return news;
};

export const fetchNewsBySlug = async (slugOrId: number | string) => {
  const identifier = encodeURIComponent(String(slugOrId));
  const response = await fetch(`${apiBaseUrl}/public/news/${identifier}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error(`Failed to load article (HTTP ${response.status})`);
  }

  const data = (await response.json()) as PublicNewsDetailResponse;

  if (!data.success) {
    throw new Error(data.message || "Failed to load article");
  }

  return data.data;
};
