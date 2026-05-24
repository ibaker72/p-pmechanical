import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        ink: {
          950: '#070a12',
          900: '#0b111c',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
        ember: {
          50: '#fff8eb',
          100: '#ffeac6',
          200: '#ffd388',
          300: '#ffb649',
          400: '#ff9b22',
          500: '#f97316',
          600: '#dc5a06',
          700: '#b6440b',
          800: '#933610',
          900: '#782e11',
        },
        steel: {
          50: '#f5f7fa',
          100: '#e9eef5',
          200: '#cdd6e3',
          300: '#a3b1c5',
          400: '#7185a3',
          500: '#516585',
          600: '#3f516d',
          700: '#344158',
          800: '#2d384a',
          900: '#1e2533',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-faint':
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        'ember-gradient':
          'linear-gradient(135deg, #ff9b22 0%, #dc5a06 50%, #782e11 100%)',
        'hero-noise':
          "radial-gradient(ellipse at top, rgba(249,115,22,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(15,23,42,0.9), #07090f 70%)",
      },
      boxShadow: {
        ember: '0 0 0 1px rgba(249,115,22,0.25), 0 20px 40px -20px rgba(249,115,22,0.45)',
        emberSoft: '0 10px 40px -15px rgba(249,115,22,0.45)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        accordionDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 4s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'accordion-down': 'accordionDown 0.25s ease-out',
        'accordion-up': 'accordionUp 0.25s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
