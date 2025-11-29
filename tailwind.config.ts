import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'wow-dark': '#0a0a0f',
        'wow-darker': '#12121a',
        'wow-card': '#1e1e2e',
        'wow-border': '#2e2e3e',
        'wow-gold': '#c9a227',
        'wow-gold-light': '#e6c547',
        'wow-purple': '#7c3aed',
        'wow-purple-light': '#a78bfa',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],
        'body': ['Crimson Pro', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config

