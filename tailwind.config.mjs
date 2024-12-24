import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "dark-emerald": "#032203",
      },
      fontFamily: {
        sans: ["ChicagoKare-Regular", ...defaultTheme.fontFamily.sans],
        mono: ["Space Mono", ...defaultTheme.fontFamily.mono],
        title: ["Sixtyfour Variable", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
};
