/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sbm: {
          green: '#10B981',
          blue: '#2563EB',
          amber: '#F59E0B',
          red: '#DC2626',
          dark: '#0F172A'
        }
      }
    },
  },
  plugins: [],
}
