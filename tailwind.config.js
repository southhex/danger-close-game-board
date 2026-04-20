/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#161a17',
        surface: '#1c2119',
        border: '#2c3a2c',
        ink: '#bbbaa8',
        muted: '#687868',
        ok: '#5a9e6e',
        neutral: '#a0a090',
        bad: '#c93535',
        warn: '#c8a030',
        wound: '#d45f27',
        dockfade: '#0e1210',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        wider2: '0.12em',
      },
    },
  },
  plugins: [],
}
