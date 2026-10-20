import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const videoInfoFilePath = path.join(uploadsDir, 'video-info.json');

// Configure multer storage for video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const safeName = `team_video_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB limit
  },
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Middleware for JSON
  app.use(express.json());

  // Serve static uploads folder explicitly
  app.use('/uploads', express.static(uploadsDir));

  const persistentJsonPath = path.resolve(__dirname, 'src/data/persistedVideo.json');

  function isOldNews(d: any): boolean {
    if (!d) return false;
    const s = JSON.stringify(d);
    return s.includes('_HHZWmEm9K4') || s.includes('TVBS') || s.includes('新聞') || s.includes('挺肚搭捷運');
  }

  function getPersistedVideo() {
    // 1. First check uploadsDir/video-info.json
    try {
      if (fs.existsSync(videoInfoFilePath)) {
        const raw = fs.readFileSync(videoInfoFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (isOldNews(data)) {
          fs.unlinkSync(videoInfoFilePath);
        } else if (data && data.type === 'file' && data.filename) {
          const filePath = path.join(uploadsDir, data.filename);
          if (fs.existsSync(filePath)) {
            return data;
          }
        } else if (data && data.type === 'url' && data.videoUrl) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Error reading videoInfoFilePath:', e);
    }

    // 2. Second check persistentJsonPath (committed in repo)
    try {
      if (fs.existsSync(persistentJsonPath)) {
        const raw = fs.readFileSync(persistentJsonPath, 'utf-8');
        const data = JSON.parse(raw);
        if (isOldNews(data)) {
          return null;
        } else if (data && data.type === 'url' && (data.videoUrl || data.url)) {
          return {
            ...data,
            videoUrl: data.videoUrl || data.url,
            title: data.title || data.name || '小組實測影片',
          };
        } else if (data && data.type === 'file' && data.fileUrl) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Error reading persistentJsonPath:', e);
    }

    return null;
  }

  function savePersistedVideo(videoData: any) {
    try {
      fs.writeFileSync(videoInfoFilePath, JSON.stringify(videoData, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write to videoInfoFilePath:', e);
    }
    try {
      fs.writeFileSync(persistentJsonPath, JSON.stringify(videoData, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write to persistentJsonPath:', e);
    }
  }

  // --- API Routes ---

  // 1. Get current saved video info
  app.get('/api/video-info', (_req, res) => {
    try {
      const video = getPersistedVideo();
      if (video) {
        return res.json({ exists: true, video });
      }
      return res.json({ exists: false });
    } catch (err) {
      console.error('Error in /api/video-info:', err);
      return res.json({ exists: false });
    }
  });

  // 2. Upload video file
  app.post('/api/upload-video', upload.single('video'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video file provided' });
      }

      // Clean up previously uploaded video files to save space
      try {
        if (fs.existsSync(videoInfoFilePath)) {
          const prev = JSON.parse(fs.readFileSync(videoInfoFilePath, 'utf-8'));
          if (prev.type === 'file' && prev.filename && prev.filename !== req.file.filename) {
            const oldPath = path.join(uploadsDir, prev.filename);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
        }
      } catch (cleanErr) {
        console.warn('Could not clean previous video:', cleanErr);
      }

      const videoData = {
        type: 'file',
        filename: req.file.filename,
        originalName: req.file.originalname,
        title: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        isDefault: false,
      };

      savePersistedVideo(videoData);

      return res.json({
        success: true,
        message: '影片檔案已成功保存在網站伺服器！所有訪客都能同步看到此影片！',
        video: videoData,
      });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // 3. Save cloud / YouTube / online URL
  app.post('/api/save-video-url', (req, res) => {
    try {
      const { url, title, description } = req.body;
      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ success: false, error: 'Valid URL is required' });
      }

      const videoData = {
        type: 'url',
        videoUrl: url.trim(),
        title: title?.trim() || '小組實測影片',
        description: description?.trim() || '',
        uploadedAt: new Date().toISOString(),
        isDefault: false,
      };

      savePersistedVideo(videoData);

      return res.json({
        success: true,
        message: '線上影片網址已成功永久保存在網站中！所有點開連結的人都能同步觀看！',
        video: videoData,
      });
    } catch (err) {
      console.error('Error saving video URL:', err);
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // 4. Delete saved video
  app.delete('/api/video', (_req, res) => {
    try {
      if (fs.existsSync(videoInfoFilePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(videoInfoFilePath, 'utf-8'));
          if (data && data.type === 'file' && data.filename) {
            const filePath = path.join(uploadsDir, data.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        } catch (_) {}
        try {
          fs.unlinkSync(videoInfoFilePath);
        } catch (_) {}
      }

      try {
        fs.writeFileSync(persistentJsonPath, JSON.stringify({ type: null }, null, 2), 'utf-8');
      } catch (_) {}

      return res.json({
        success: true,
        message: '影片已移除',
      });
    } catch (err) {
      console.error('Error deleting video:', err);
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // 5. Download complete source code ZIP
  app.get('/api/download-source-zip', (_req, res) => {
    const zipPath = path.resolve(__dirname, 'public/project-source.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'stand-firm-mommy-full-code.zip');
    } else {
      res.status(404).send('ZIP file not found');
    }
  });

  // 6. Download single unified text file containing all code
  app.get('/api/download-full-code-text', (_req, res) => {
    const txtPath = path.resolve(__dirname, 'public/FULL_PROJECT_CODE.txt');
    if (fs.existsSync(txtPath)) {
      res.download(txtPath, 'FULL_PROJECT_CODE.txt');
    } else {
      res.status(404).send('Full code text file not found');
    }
  });

  // --- Vite / Static Handling ---

  if (!isProduction) {
    // Development: integrate Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static assets from dist
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Parse CLI args (e.g., --port 3000 --host 0.0.0.0 passed by npm or supervisor)
  const args = process.argv.slice(2);
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  let host = '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--host') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        host = args[i + 1];
      } else {
        host = '0.0.0.0';
      }
    }
  }

  server.listen(port, host, () => {
    console.log(`> Server running on http://${host}:${port} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
