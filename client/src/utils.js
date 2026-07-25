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

const DEFAULT_EXCHANGE_RATE = 43;
const EXCHANGE_RATE_KEY = "nexor_exchange_rate";

export function getDefaultExchangeRate() {
  const stored = localStorage.getItem(EXCHANGE_RATE_KEY);
  return stored ? parseFloat(stored) || DEFAULT_EXCHANGE_RATE : DEFAULT_EXCHANGE_RATE;
}

export function setDefaultExchangeRate(rate) {
  localStorage.setItem(EXCHANGE_RATE_KEY, String(rate));
}
