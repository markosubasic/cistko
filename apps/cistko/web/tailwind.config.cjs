/** Tailwind 3 with the shared @dt/ui preset; Čistko adds a few type sizes the preset leaves out. */
module.exports = {
  presets: [require('@dt/ui/tailwind-preset')],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
    },
  },
};
