import { Router } from 'express';
import { listImagesInFolder } from '../controllers/cloudinary.controller';

const router = Router();

/**
 * @swagger
 * /api/cloudinary/images/{folderName}:
 *   get:
 *     summary: Retrieve a list of image URLs from a specified Cloudinary folder.
 *     description: Fetches all image URLs from the given folder path in Cloudinary.
 *     parameters:
 *       - in: path
 *         name: folderName
 *         required: true
 *         description: The path to the folder in Cloudinary (e.g., 'path/to/your/folder').
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: An array of image URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 format: url
 *       400:
 *         description: Folder name parameter is required.
 *       404:
 *         description: No images found in the folder or folder does not exist.
 *       500:
 *         description: Error fetching images from Cloudinary.
 */
router.get(new RegExp('^/images/(.*)$'), listImagesInFolder); // Using a RegExp literal for the route

export default router; 