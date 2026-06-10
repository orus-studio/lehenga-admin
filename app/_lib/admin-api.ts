"use client";

import { getAdminToken } from "./admin-auth";

import { normalizeCatalogImageUrls } from "./catalog-image-url";

const ADMIN_API_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  withAuth?: boolean;
};

const ADMIN_CACHE_TTL_MS = 30 * 1000;
const adminReadCache = new Map<string, { expiresAt: number; value: unknown }>();
const adminInflightReads = new Map<string, Promise<unknown>>();

function getRequestCacheKey(path: string, token: string | null) {
  return `${token ?? "anonymous"}:${path}`;
}

export function clearAdminRequestCache() {
  adminReadCache.clear();
  adminInflightReads.clear();
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { success?: boolean; message?: string; data?: unknown };
  } catch {
    return null;
  }
}

export async function adminRequest<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  let token: string | null = null;

  if (options.withAuth) {
    token = getAdminToken();

    if (!token) {
      throw new Error("Admin token is missing");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  const cacheKey = getRequestCacheKey(path, token);

  if (method === "GET") {
    const cached = adminReadCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const inflight = adminInflightReads.get(cacheKey);

    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    const json = await readJson(response);

    if (!response.ok) {
      throw new Error(json?.message ?? "Request failed");
    }

    const data = normalizeCatalogImageUrls((json?.data ?? json) as T);

    if (method === "GET") {
      adminReadCache.set(cacheKey, {
        expiresAt: Date.now() + ADMIN_CACHE_TTL_MS,
        value: data,
      });
    } else {
      clearAdminRequestCache();
    }

    return data;
  })();

  if (method === "GET") {
    adminInflightReads.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (method === "GET") {
      adminInflightReads.delete(cacheKey);
    }
  }
}

export type DashboardData = {
  categories: Array<{ id: string; name: string }>;
  lehengas: Array<{ id: string; name: string; status: string }>;
  jewellery: Array<{ id: string; name: string; status: string }>;
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const [categories, lehengas, jewellery] = await Promise.all([
    adminRequest<Array<{ id: string; name: string }>>("/admin/categories", { withAuth: true }),
    adminRequest<Array<{ id: string; name: string; status: string }>>("/admin/lehengas", {
      withAuth: true,
    }),
    adminRequest<Array<{ id: string; name: string; status: string }>>("/admin/jewellery", {
      withAuth: true,
    }),
  ]);

  return { categories, lehengas, jewellery };
}
