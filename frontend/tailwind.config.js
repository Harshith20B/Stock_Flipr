// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enables dark mode via class strategy
  theme: {
    extend: {
      colors: {
        lightBackground: '#F9FAFB',
        lightText: '#1F2937',
        lightCard: '#FFFFFF',
        darkBackground: '#1F2937',
        darkText: '#E5E7EB',
        darkCard: '#2D3748',
        primary: '#3B82F6',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slow-spin': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [require('daisyui')], // 👈 Add DaisyUI plugin here
};
