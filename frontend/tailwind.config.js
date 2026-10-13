/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          bg: '#060e20',
          surface: '#0c1836',
          card: '#0f2048',
          cardHover: '#13285c',
          blue: '#0077ff',
          neon: '#00c3ff',
          lightBlue: '#38bdf8',
          ice: '#e0f2fe',
          white: '#ffffff',
          slate: '#94a3b8',
          border: 'rgba(0, 195, 255, 0.25)',
          borderWhite: 'rgba(255, 255, 255, 0.18)',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      boxShadow: {
        'medical-glow': '0 0 20px rgba(0, 195, 255, 0.25)',
        'medical-white': '0 4px 20px rgba(255, 255, 255, 0.15)',
      },
    },
  },
  plugins: [],
};
