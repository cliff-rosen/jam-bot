/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flowingDot: {
          '0%': {
            transform: 'translateY(0) scale(0.8)',
            opacity: 0.5
          },
          '50%': {
            transform: 'translateY(-4px) scale(1)',
            opacity: 1
          },
          '100%': {
            transform: 'translateY(0) scale(0.8)',
            opacity: 0.5
          }
        },
        glowPulse: {
          '0%, 100%': {
            opacity: 0.3,
            transform: 'scale(0.98)'
          },
          '50%': {
            opacity: 0.8,
            transform: 'scale(1)'
          }
        },
        'workflow-progress': {
          '0%': {
            width: '0%',
            opacity: 0.8
          },
          '50%': {
            opacity: 1
          },
          '100%': {
            width: '100%',
            opacity: 0.8
          }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'flowing-dot': 'flowingDot 1.4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'workflow-progress': 'workflow-progress 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out'
      }
    },
  },
  plugins: [],
}