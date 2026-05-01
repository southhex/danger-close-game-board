/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'oklch(0.175 0.006 130)',
        surface:  'oklch(0.215 0.006 130)',
        surface2: 'oklch(0.255 0.006 130)',
        border:   'oklch(0.26  0.005 130)',
        ink:      'oklch(0.94  0.006 90)',
        'ink-dim':'oklch(0.78  0.006 90)',
        muted:    'oklch(0.62  0.006 100)',
        subtle:   'oklch(0.48  0.006 100)',
        accent:   'oklch(0.72  0.13  155)',
        ok:       'oklch(0.76  0.13  155)',
        grazed:   'oklch(0.82  0.13  90)',
        wounded:  'oklch(0.72  0.15  45)',
        bad:      'oklch(0.65  0.19  25)',
        dead:     'oklch(0.50  0.02  100)',
        warn:     'oklch(0.82  0.13  90)',
        neutral:  'oklch(0.62 0.006 100)',
        wound:    'oklch(0.72 0.15 45)',
        dockfade: 'oklch(0.13  0.005 130)',
      },
      boxShadow: {
        dock: '0 -4px 12px rgba(0,0,0,0.5)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs:   '4px',
        sm:   '6px',
        md:   '8px',
        lg:   '10px',
        xl:   '12px',
        '2xl':'14px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
