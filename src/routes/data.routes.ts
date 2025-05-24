import { Router } from 'express';
import { serveDataFile, serveWorkData, serveWorkItemImages } from '../controllers/data.controller';

const router = Router();

/**
 * @swagger
 * /api/data/work:
 *   get:
 *     summary: Retrieve processed work.json data (details only).
 *     description: Fetches work.json and returns project details. Image URLs are excluded and should be fetched separately per item.
 *     responses:
 *       200:
 *         description: The processed work.json data (details only).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkItem' # Assuming you'll define WorkItem in Swagger components
 *       500:
 *         description: Error fetching or processing work data.
 */
router.get('/work', serveWorkData);

/**
 * @swagger
 * /api/data/work/{title}/images:
 *   get:
 *     summary: Retrieve image URLs for a specific work item.
 *     description: Fetches all direct and Cloudinary-derived image URLs for a given work item title.
 *     parameters:
 *       - in: path
 *         name: title
 *         required: true
 *         description: The URL-encoded title of the work item.
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
 *         description: Work item title parameter is required.
 *       404:
 *         description: Work item not found or no images found.
 *       500:
 *         description: Error serving work item images.
 */
router.get('/work/:title/images', serveWorkItemImages);

/**
 * @swagger
 * /api/data/{fileName}:
 *   get:
 *     summary: Retrieve the content of a specified JSON data file.
 *     description: Fetches the content of allowed JSON files like projects.json or photos.json. For work.json, it uses the processed version via /api/data/work.
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         description: The name of the JSON file to retrieve (e.g., 'projects.json', 'photos.json'). Note: 'work.json' here will also return processed data.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The content of the requested JSON file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # Or array, depending on the JSON structure
 *       400:
 *         description: File name parameter is required.
 *       403:
 *         description: Access to the specified file is not allowed.
 *       404:
 *         description: Data file not found.
 *       500:
 *         description: Error serving data file.
 */
router.get('/:fileName', serveDataFile);

export default router; 