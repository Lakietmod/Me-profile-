import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

async function startServer() {
    const app = express();
    const PORT = 3000;

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
        });
        app.use(vite.middlewares);

        app.get('*', async (req, res, next) => {
            const url = req.originalUrl;
            
            // Only handle the root or exactly index.html
            if (url !== '/' && url !== '/index.html') {
                return next();
            }

            try {
                const indexPath = path.join(process.cwd(), 'index.html');
                let htmlContent = fs.readFileSync(indexPath, 'utf-8');

                // Apply Vite's transformations (needed for HMR and module loading, etc.)
                htmlContent = await vite.transformIndexHtml(url, htmlContent);

                // Tự động tạo avatar random từ DiceBear API
                const randomSeed = Math.random().toString(36).substring(7);
                let randomAvtPath = `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${randomSeed}`;

                // 4. Inject vào HTML
                htmlContent = htmlContent.replace(/{{AVATAR_URL}}/g, randomAvtPath);

                res.status(200).set({ 'Content-Type': 'text/html' }).end(htmlContent);
            } catch (error) {
                vite.ssrFixStacktrace(error as Error);
                console.error('Lỗi render index:', error);
                res.status(500).end(String(error));
            }
        });
    } else {
        // Production Mode
        const distPath = path.join(process.cwd(), 'dist');
        const distClientPath = path.join(distPath, 'client'); // if needed, tho standard vite build sets it up in dist
        
        // Ensure static files are accessible
        app.use(express.static(distPath));

        app.get('*', (req, res) => {
            try {
                // In production, we need to read the built index.html
                const indexPath = path.join(distPath, 'index.html');
                if (!fs.existsSync(indexPath)) {
                    return res.status(404).send('Not Found');
                }
                
                let htmlContent = fs.readFileSync(indexPath, 'utf-8');

                const randomSeed = Math.random().toString(36).substring(7);
                let randomAvtPath = `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${randomSeed}`;

                htmlContent = htmlContent.replace(/{{AVATAR_URL}}/g, randomAvtPath);
                res.status(200).set({ 'Content-Type': 'text/html' }).end(htmlContent);
            } catch (error) {
                console.error('Lỗi render index:', error);
                res.status(500).end(String(error));
            }
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SYS] Hub đang chạy tại http://0.0.0.0:${PORT}`);
    });
}

startServer();
