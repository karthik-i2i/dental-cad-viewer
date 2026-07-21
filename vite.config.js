import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['three'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/**/__tests__/**',
        'src/**/*.test.{js,jsx}',
      ],
    },
  },
});

