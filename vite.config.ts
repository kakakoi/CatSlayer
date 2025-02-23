import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: '/CatSlayer/',
    publicDir: 'public',
    server: {
        host: true,
        port: 3000,
        open: true,
        watch: {
            usePolling: true,
            ignored: ['**/node_modules/**', '**/dist/**'],
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
});
