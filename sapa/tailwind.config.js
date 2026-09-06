/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Emergency-broadcast palette. Deliberately not fintech blue:
        // warm charcoal ground, hazard amber, siren red, all-clear green.
        ash:     { 900: '#0D0B08', 800: '#141110', 700: '#1D1917', 600: '#2A2522', 500: '#3B3531' },
        bone:    { 100: '#F7F3E8', 200: '#E8E2D2', 300: '#C9C2AE' },
        hazard:  { DEFAULT: '#FFB000', dark: '#C98A00', light: '#FFD166' },
        siren:   { DEFAULT: '#FF4D2E', dark: '#C7361D' },
        allclear:{ DEFAULT: '#3DD68C', dark: '#22A669' },
        watch:   { DEFAULT: '#FF8A3D' }
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      keyframes: {
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        blip: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
        rise: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'none' } }
      },
      animation: {
        ticker: 'ticker 32s linear infinite',
        blip: 'blip 1.6s ease-in-out infinite',
        rise: 'rise 0.25s ease-out both',
        pop: 'pop 0.25s ease-out both'
      }
    }
  },
  plugins: []
};
