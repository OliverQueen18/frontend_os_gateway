/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0F766E',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        slate: {
          850: '#172033',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      backgroundImage: {
        mesh: `
          radial-gradient(at 12% 18%, rgba(15, 118, 110, 0.12) 0px, transparent 45%),
          radial-gradient(at 88% 12%, rgba(14, 165, 233, 0.08) 0px, transparent 40%),
          radial-gradient(at 70% 80%, rgba(15, 118, 110, 0.08) 0px, transparent 45%),
          linear-gradient(160deg, #f8fafc 0%, #f1f5f9 45%, #eef6f5 100%)
        `,
      },
    },
  },
  plugins: [],
};
