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
      pourpre: "#932a58",
      transparent: 'transparent',
      white: colors.white,
    },
  },
  plugins: [],
}
