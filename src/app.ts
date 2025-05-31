import dotenv from 'dotenv';
import path from 'path'; // Import path module

// Configure dotenv to load the .env file
// In production, load from the 'current' subdirectory
// In development, load from the project root
let dotEnvPath;
if (process.env.NODE_ENV === 'production') {
  dotEnvPath = path.resolve(process.cwd(), 'current', '.env');
} else {
  dotEnvPath = path.resolve(process.cwd(), '.env');
}
dotenv.config({ path: dotEnvPath });

// ---- START DEBUGGING: Check Cloudinary Env Vars ----
// console.log('[DEBUG] Dotenv loaded. Checking Cloudinary variables:');
// console.log(`[DEBUG] CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME}`);
// console.log(`[DEBUG] CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY}`);
// console.log(`[DEBUG] CLOUDINARY_API_SECRET (length): ${process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.length : 'undefined'}`);
// console.log(`[DEBUG] PORT: ${process.env.PORT}`);
// ---- END DEBUGGING ----

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

// Import routes
import cloudinaryRoutes from './routes/cloudinary.routes';
import dataRoutes from './routes/data.routes';

const app: Express = express();
const port = Number(process.env.PORT) || 7001; // Ensure port is a number

// Define allowed origins
const allowedOrigins = [
  'https://www.estebanbasili.com', // Production frontend
  process.env.FRONTEND_LOCAL_URL || 'http://localhost:5173' // Local development frontend
].filter(Boolean) as string[];

// Middleware
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Or for server-to-server communication if your VITE_API_BASE_URL is the same as backend origin
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin === `http://localhost:${port}`)) {
      callback(null, true);
    } else {
      console.error("CORS error: Origin not allowed:", origin, "Allowed origins:", allowedOrigins);
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
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/data', dataRoutes);

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