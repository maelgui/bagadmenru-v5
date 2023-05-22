/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors')

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    colors: {
      pourpre: {
        50: "#f4eaee",
        100: "#e9d4de",
        200: "#d4aabc",
        300: "#be7f9b",
        400: "#a95579",
        500: "#932a58",
        600: "#762246",
        700: "#581935",
        800: "#3b1123",
        900: "#1d0812"
      },
      transparent: 'transparent',
      white: colors.white,
      gray: colors.gray,
      red: colors.red,
      emerald: colors.emerald,
    },
  },
  plugins: [],
}
