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
      camelot: {
        50: '#fcf3f8',
        100: '#f9eaf4',
        200: '#f5d5e8',
        300: '#efb2d5',
        400: '#e482b8',
        500: '#d75d9d',
        600: '#c43e7f',
        700: '#a92d65',
        800: '#932a58',
        900: '#752649',
        950: '#471028',
      },
      transparent: 'transparent',
      white: colors.white,
      gray: colors.gray,
      red: colors.red,
      emerald: colors.emerald,
      sky: colors.sky,
      amber: colors.amber,
    },
    fontFamily: {
      'sans': ["Montserrat"]
    },
  },
  plugins: [],
}
