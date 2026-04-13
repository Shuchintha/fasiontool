import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database on startup
getDb();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes will be added in subsequent steps
// app.use('/api/images', imagesRouter);
// app.use('/api/filters', filtersRouter);
// app.use('/api/annotations', annotationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
