/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#020617',      // Slate 950 - Quase preto
        'surface': '#0f172a',         // Slate 900 - Cards
        'accent': '#3b82f6',          // Blue 500 - Acento
        'text-secondary': '#64748b',  // Slate 500 - Textos de apoio
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-blue-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
      },
    },
  },
  plugins: [],
}

