import { v2 as cloudinary } from 'cloudinary';
// import dotenv from 'dotenv'; // No longer needed here

// dotenv.config(); // REMOVE THIS LINE - dotenv is configured in app.ts

// Configure Cloudinary with credentials from environment variables
// These variables should be set in your .env file and loaded by app.ts

// Optional: The warning can still be useful if you want to keep it,
// but it will fire based on what app.ts has loaded into process.env.
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn(
    '[cloudinary.config.ts] Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully set in process.env. Cloudinary integration may not work.'
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Optional: ensures HTTPS URLs
});

export default cloudinary; 