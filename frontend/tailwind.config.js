// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode by adding a class
  theme: {
    extend: {
      colors: {
        lightBackground: '#F9FAFB', // Light background color
        lightText: '#1F2937', // Light text color
        lightCard: '#FFFFFF', // Light card background color
        darkBackground: '#1F2937', // Dark background color
        darkText: '#E5E7EB', // Dark text color
        darkCard: '#2D3748', // Dark card background color
        primary: '#3B82F6', // Primary color (blue)
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slow-spin': 'spin 3s linear infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 }
        }
      }
    },
  },
  plugins: [],
};
