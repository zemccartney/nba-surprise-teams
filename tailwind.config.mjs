import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0px 0px 80px 40px rgb(163 230 53 / 0.5)", // shadow-lime-400/50
        "glow-sm": "0px 0px 40px 20px rgb(163 230 53 / 0.5)",
      },
      colors: {
        "dark-emerald": "#032203",
      },
      fontFamily: {
        sans: ["ChicagoKare-Regular", ...defaultTheme.fontFamily.sans],
        title: ["Sixtyfour Variable", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
};
