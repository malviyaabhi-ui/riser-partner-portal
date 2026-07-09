export const USD_RATE = 3.679; // AED per 1 USD

export function fmtMoney(aed, currency = "AED") {
  const n = Number(aed || 0);
  if (currency === "USD") {
    return "$" + (n / USD_RATE).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return "AED " + n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}
