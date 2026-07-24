/**
 * Converts a PascalCase page name (with optional query string) to a URL path.
 * e.g. "ServiceOrderDetail?id=123" → "/service-order-detail?id=123"
 */
export function createPageUrl(pageName) {
  const [page, query] = pageName.split("?");
  const path =
    "/" +
    page
      .replace(/([A-Z])/g, (match, letter, offset) =>
        offset === 0 ? letter.toLowerCase() : "-" + letter.toLowerCase()
      );
  return query ? `${path}?${query}` : path;
}
