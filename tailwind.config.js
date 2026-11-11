/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aao-dark-blue': '#012345',
        'aao-dark-red': '#B72717',
        'aao-light-blue': '#388CBB',
        'aao-pale-blue': '#E6F2F9',
        'aao-accessible-blue': '#2D759E',
        'aao-light-red': '#D55855',
        'aao-beige': '#FBF3E3',
      },
      fontFamily: {
        accent: ['"Source Serif 4"', 'Georgia', 'serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [
    typography,
  ],
}
