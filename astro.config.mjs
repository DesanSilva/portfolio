import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const font = (name, cssVariable, weights) => ({
  provider: fontProviders.fontsource(),
  name,
  cssVariable,
  weights,
  styles: ['normal'],
  subsets: ['latin'],
  fallbacks: ['sans-serif'],
});

export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'always' },
  vite: { plugins: [tailwindcss()] },
  fonts: [
    font('Outfit', '--font-display', [300]),
    font('Montserrat', '--font-text', [500]),
    font('Inter', '--font-ui', [300]),
  ],
});
