/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0D2B6B", 2: "#091E4D", 3: "#123483" },
        teal:  { DEFAULT: "#0CB8B6", dark: "#089694" },
        champagne: "#C9A96E",
        ink: "#16213E",
        muted: "#6B7385",
        faint: "#9AA1B2",
        line: "#E4E7EE",
        page: "#F5F6F9",
        good: "#1B9E64",
        warn: "#C97E1A",
        bad:  "#C43B3B"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
