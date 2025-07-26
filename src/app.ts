import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load the .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

// Import routes
import cloudinaryRoutes from './routes/cloudinary.routes.js';
import dataRoutes from './routes/data.routes.js';
import blogRoutes from './routes/blog.routes.js';
import { serveSitemap, serveRobotsTxt } from './controllers/sitemap.controller.js';

const app: Express = express();
const port = Number(process.env.PORT) || 7001; // Ensure port is a number

// Define allowed origins
const allowedOrigins = [
  'https://www.estebanbasili.com', // Production frontend
  'https://estebanbasili.com', // Production frontend (non-www)
  process.env.FRONTEND_URL, // As configured in Coolify
  process.env.FRONTEND_LOCAL_URL || 'http://localhost:5173', // Local development frontend (default Vite port)
  'http://localhost:5174', // Alternative common Vite development port
  'http://localhost:3000', // Alternative React development port
].filter(Boolean) as string[];

// Use a Set to store unique origins, preventing duplicates.
const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

// Middleware
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Or for server-to-server communication if your VITE_API_BASE_URL is the same as backend origin
    if (!origin || uniqueAllowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin === `http://localhost:${port}`)) {
      callback(null, true);
    } else {
      console.error("CORS error: Origin not allowed:", origin, "Allowed origins:", uniqueAllowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true // If you need to send cookies or authorization headers
};
app.use(cors(corsOptions)); // Enable CORS for specific origins
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.use('/api/blog', blogRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/data', dataRoutes);

// SEO Routes (sitemap and robots.txt)
app.get('/sitemap.xml', serveSitemap);
app.get('/robots.txt', serveRobotsTxt);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Locus Backend is running!');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`[server]: Server is running at http://0.0.0.0:${port}`);
});

export default app; 