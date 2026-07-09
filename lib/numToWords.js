const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n) {
  let s = "";
  if (n >= 100) { s += ones[Math.floor(n / 100)] + " Hundred"; n %= 100; if (n) s += " "; }
  if (n >= 20) { s += tens[Math.floor(n / 10)]; n %= 10; if (n) s += "-" + ones[n]; }
  else if (n > 0) s += ones[n];
  return s;
}

export function numToWords(amount, currency = "AED") {
  const whole = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - whole) * 100);
  if (whole === 0 && cents === 0) return "Zero";
  const units = [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [1, ""]];
  let n = whole, words = [];
  for (const [v, name] of units) {
    if (n >= v) {
      const chunk = Math.floor(n / v);
      words.push(threeDigits(chunk) + (name ? " " + name : ""));
      n %= v;
    }
  }
  const cur = currency === "USD" ? "United States Dollar" : "UAE Dirham";
  const sub = currency === "USD" ? "Cents" : "Fils";
  let out = `${cur} ${words.join(" ")}`;
  if (cents) out += ` and ${threeDigits(cents)} ${sub}`;
  return out + " Only";
}
