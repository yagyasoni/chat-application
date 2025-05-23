module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          500: '#00D68F', // WhatsApp green
        },
        gray: {
          100: '#F0F2F5', // Light gray background
          // 200: '#ECE5DD', // Chat background
          800: '#FFFFFF', // Sidebar background
          400: '#AEBAC1', // Sidebar icons
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};