import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d0f15",
        panel: "#161a24",
        panel2: "#1f2433",
        border: "#2a3144",
        accent: "#ffb000",
        accent2: "#ff5f6d",
        good: "#3ecf8e",
        bad: "#ff4d6d",
        muted: "#8b91a3",
      },
    },
  },
  plugins: [],
};
export default config;
