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
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options.withAuth) {
    const token = getAdminToken();

    if (!token) {
      throw new Error("Admin token is missing");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = await readJson(response);

  if (!response.ok) {
    throw new Error(json?.message ?? "Request failed");
  }

  return normalizeCatalogImageUrls((json?.data ?? json) as T);
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
