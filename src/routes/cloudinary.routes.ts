import { Router } from 'express';
import { listImagesInFolder, listPhotographyImages } from '../controllers/cloudinary.controller.js';

const router = Router();

/**
 * @swagger
 * /api/cloudinary/photography:
 *   get:
 *     summary: Retrieve all photography images from nested folder structure
 *     description: Fetches all images from the photography folder with YYYY_Topic subfolders, including their metadata with parsed year and topic information.
 *     responses:
 *       200:
 *         description: An array of Cloudinary photography image objects with parsed metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   public_id:
 *                     type: string
 *                     description: The public ID of the image.
 *                   secure_url:
 *                     type: string
 *                     format: url
 *                     description: The HTTPS URL of the image.
 *                   width:
 *                     type: integer
 *                     description: The width of the image in pixels.
 *                   height:
 *                     type: integer
 *                     description: The height of the image in pixels.
 *                   format:
 *                     type: string
 *                     description: The format of the image (e.g., 'jpg', 'png').
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: The creation date of the image.
 *                   metadata:
 *                     type: object
 *                     description: Parsed metadata including year, topic, folder, and category.
 *                     properties:
 *                       year:
 *                         type: string
 *                         description: Extracted year from folder name
 *                       topic:
 *                         type: string
 *                         description: Extracted topic from folder name
 *                       folder:
 *                         type: string
 *                         description: Original folder name (YYYY_Topic)
 *                       category:
 *                         type: string
 *                         description: Topic used as category for filtering
 *                     additionalProperties: true
 *       500:
 *         description: Error fetching photography images from Cloudinary.
 */
router.get('/photography', listPhotographyImages);

/**
 * @swagger
 * /api/cloudinary/images/{folderName}:
 *   get:
 *     summary: Retrieve a list of image objects from a specified Cloudinary folder, including metadata.
 *     description: Fetches all images from the given folder path in Cloudinary, including their public_id, secure_url, dimensions, format, creation date, and metadata.
 *     parameters:
 *       - in: path
 *         name: folderName
 *         required: true
 *         description: The path to the folder in Cloudinary (e.g., 'path/to/your/folder').
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: An array of Cloudinary image objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   public_id:
 *                     type: string
 *                     description: The public ID of the image.
 *                   secure_url:
 *                     type: string
 *                     format: url
 *                     description: The HTTPS URL of the image.
 *                   width:
 *                     type: integer
 *                     description: The width of the image in pixels.
 *                   height:
 *                     type: integer
 *                     description: The height of the image in pixels.
 *                   format:
 *                     type: string
 *                     description: The format of the image (e.g., 'jpg', 'png').
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: The creation date of the image.
 *                   metadata:
 *                     type: object
 *                     description: A key-value map of custom metadata fields. Example includes 'photographer'.
 *                     additionalProperties: true # Allows any other metadata fields
 *       400:
 *         description: Folder name parameter is required.
 *       404:
 *         description: No images found in the folder or folder does not exist.
 *       500:
 *         description: Error fetching images from Cloudinary.
 */
router.get(/\/images\/(.+)/, listImagesInFolder);

export default router;