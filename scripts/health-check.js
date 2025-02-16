import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TIMEOUT = 30000; // 30秒のタイムアウト
const SERVER_URL = 'http://localhost:4173';

async function waitForServer(url, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const response = await fetch(url);
            if (response.status === 200) {
                return true;
            }
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    throw new Error(`Server did not respond within ${timeout}ms`);
}

async function runHealthCheck() {
    let server;
    try {
        // プレビューサーバーを起動
        server = spawn('npm', ['run', 'preview'], {
            stdio: 'pipe',
            shell: true,
            cwd: resolve(__dirname, '..'),
        });

        // サーバーの起動を待機
        await waitForServer(SERVER_URL, TIMEOUT);

        // ページの取得とチェック
        const response = await fetch(SERVER_URL);
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // 基本的なチェック
        const checks = [
            {
                test: () => document.querySelector('canvas#gameCanvas'),
                message: 'Canvas element not found',
            },
            {
                test: () => document.querySelector('script[type="module"]'),
                message: 'Module script not found',
            },
            {
                test: () => !html.includes('Error:'),
                message: 'Error found in HTML content',
            },
            {
                test: () => response.status === 200,
                message: 'Page did not return 200 status',
            },
        ];

        // チェックの実行
        for (const check of checks) {
            if (!check.test()) {
                throw new Error(check.message);
            }
        }

        console.log('✅ Health check passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
    } finally {
        // サーバーの終了
        if (server) {
            server.kill();
        }
    }
}

runHealthCheck();
