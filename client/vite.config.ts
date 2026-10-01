import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, '../shared'),
    },
  },
  server: { port: 5173, fs: { allow: ['..'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
