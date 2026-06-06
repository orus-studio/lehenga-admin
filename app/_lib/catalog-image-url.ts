function getCloudFrontBaseUrl() {
  return process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN?.replace(/\/$/, "");
}

export function getCatalogImageUrl(imageUrl: string) {
  const cloudFrontBaseUrl = getCloudFrontBaseUrl();

  if (
    !cloudFrontBaseUrl ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith(`${cloudFrontBaseUrl}/`) ||
    imageUrl === cloudFrontBaseUrl
  ) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);

    if (url.hostname.includes(".s3.") || url.hostname.endsWith(".s3.amazonaws.com")) {
      return `${cloudFrontBaseUrl}${url.pathname}`;
    }

    if (url.hostname.startsWith("s3.") || url.hostname === "s3.amazonaws.com") {
      const [, , ...keyParts] = url.pathname.split("/");

      return keyParts.length > 0 ? `${cloudFrontBaseUrl}/${keyParts.join("/")}` : imageUrl;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

export function normalizeCatalogImageUrls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeCatalogImageUrls(entry)) as T;
  }

  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "imageUrl" && typeof entry === "string"
        ? getCatalogImageUrl(entry)
        : normalizeCatalogImageUrls(entry),
    ]),
  ) as T;
}
