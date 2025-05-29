import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'; // Import path module

// Import routes
import cloudinaryRoutes from './routes/cloudinary.routes';
import dataRoutes from './routes/data.routes';

// Configure dotenv to load the .env file from the 'current' subdirectory
// This assumes PM2's cwd is the parent of 'current' (e.g., /var/www/locus-backend)
dotenv.config({ path: path.resolve(process.cwd(), 'current', '.env') });

const app: Express = express();
const port = process.env.PORT || 3001; // Default to 3001 if not specified

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

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Locus Backend is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app; 