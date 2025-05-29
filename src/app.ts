import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Import routes
import cloudinaryRoutes from './routes/cloudinary.routes';
import dataRoutes from './routes/data.routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001; // Default to 3001 if not specified

// Middleware
const corsOptions = {
  origin: 'https://www.estebanbasili.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions)); // Enable CORS for specific origin
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