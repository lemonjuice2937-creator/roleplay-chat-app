/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#19192e',
          800: '#141428',
          700: '#041642',
          600: '#002063',
          500: '#003e91',
        },
        neon: {
          DEFAULT: '#0D5CA8',
          light: '#1E74C4',
          dark: '#002063',
        },
        accent: {
          400: '#1E74C4',
          500: '#0D5CA8',
          600: '#002063',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
