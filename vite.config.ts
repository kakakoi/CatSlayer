import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    server: {
        port: 3000,
        open: true,
        watch: {
            usePolling: true,
            ignored: ['**/node_modules/**', '**/dist/**']
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true
    }
}); 