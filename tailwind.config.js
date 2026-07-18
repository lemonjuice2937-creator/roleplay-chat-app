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
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6B21A8',
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
