/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fiscalyx design system (semantic term.* tokens map to the palette,
        // so every existing view adopts the new look without per-component edits).
        term: {
          bg: "#050505",       // --bg-void
          panel: "#0F1012",    // --bg-panel
          border: "#1F2226",   // --line
          borderlight: "#2A2E33",
          amber: "#FF9500",    // --accent-amber
          green: "#3DDC84",    // --pos
          red: "#FF5C5C",      // --neg
          cyan: "#4FD1E8",     // --accent-cyan
          gray: "#9AA0A8",
          dim: "#6B7078",      // --text-dim
          white: "#E8E6E1",    // --text-primary (warm off-white, never pure #fff)
        },
      },
      fontFamily: {
        // Data/tabular face → IBM Plex Mono; headers/nav → IBM Plex Sans Condensed
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(61,220,132,0.30)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(255,92,92,0.30)" },
          "100%": { backgroundColor: "transparent" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        flashGreen: "flashGreen 0.6s ease-out",
        flashRed: "flashRed 0.6s ease-out",
        blink: "blink 1s step-start infinite",
      },
    },
  },
  plugins: [],
};
