/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Bloomberg terminal palette
        term: {
          bg: "#000000",
          panel: "#0a0a0a",
          border: "#1c1c1c",
          borderlight: "#2a2a2a",
          amber: "#FFB000",
          green: "#00FF66",
          red: "#FF3336",
          cyan: "#00E5FF",
          gray: "#8a8a8a",
          dim: "#4a4a4a",
          white: "#e8e8e8",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(0,255,102,0.35)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(255,51,54,0.35)" },
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
