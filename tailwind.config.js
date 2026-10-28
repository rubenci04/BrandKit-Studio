/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { 950: '#0b0b14', 900: '#11111d', 800: '#181826', 700: '#232336', 600: '#34344d' },
        accent: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        glow: { 400: '#22d3ee', 500: '#06b6d4' },
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { fadeUp: 'fadeUp .35s ease-out both' },
    },
  },
  plugins: [],
}
