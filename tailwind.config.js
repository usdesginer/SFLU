/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sfl: {
          sunflower: '#F7C948',
          gold: '#ECC94B',
          amber: '#D69E2E',
          dirt: '#8D5B4C',
          darkdirt: '#543D2B',
          grass: '#48BB78',
          forest: '#2F855A',
          deepgreen: '#1C4532',
          soil: '#38281f',
          parchment: '#FDF6E2',
          cream: '#FFFDF9',
        },
      },
      fontFamily: {
        pixel: ['Courier New', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
};
