/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0E0F1B',
          800: '#121324',
          700: '#1A1C2D',
          600: '#232539',
          500: '#2D3047',
        },
        neon: {
          DEFAULT: '#8A2BE2',
          light: '#A855F7',
          dark: '#6B21A8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
