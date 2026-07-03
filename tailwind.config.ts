import type { Config } from 'tailwindcss';

/**
 * Skelion Enterprises brand tokens — sourced from CLAUDE.md (official charte graphique).
 * Exact hex values only. Never introduce colors outside this palette.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E1318', // base background
          2: '#131A21', // panel
          3: '#182129', // raised panel
        },
        cyan: { DEFAULT: '#13C7EC' }, // primary accent, CTAs, links
        teal: { DEFAULT: '#2FE6C4' }, // terminal success, secondary accent
        slate: { DEFAULT: '#5B6772' }, // exact brand chart value (Slate). Used for muted text + (via 'soft') borders at 35% alpha
        paper: {
          DEFAULT: '#F8FAFB', // primary text
          dim: '#C4CCD2',
        },
        // Terminal chrome dots (from approved reference design)
        termred: '#FF5F57',
        termamber: '#FEBC2E',
        termgreen: '#28C840',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'], // headings 500/600/700
        body: ['"IBM Plex Sans"', 'sans-serif'], // body 400/500/600
        mono: ['"IBM Plex Mono"', 'monospace'], // prompts, labels, nav, terminal
      },
      borderColor: {
        soft: 'rgba(91,103,114,.35)', // slate @ 35% alpha per brand rules
      },
      maxWidth: {
        site: '1180px',
      },
      borderRadius: {
        brand: '6px',
        panel: '10px',
      },
      keyframes: {
        blink: { '50%': { opacity: '0' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.3' } },
      },
      animation: {
        blink: 'blink 1.1s steps(1) infinite',
        'blink-fast': 'blink 1s steps(1) infinite',
        pulse2: 'pulse2 2s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
