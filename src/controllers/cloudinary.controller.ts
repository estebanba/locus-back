import { Request, Response } from 'express';
import { getImagesFromFolder } from '../services/cloudinary.service.js';

/**
 * Controller to handle requests for fetching images from a Cloudinary folder.
 */
export const listImagesInFolder = async (req: Request, res: Response): Promise<void> => {
  const folderName = req.params[0];

  if (!folderName) {
    res.status(400).json({ message: 'Folder name parameter is required.' });
    return;
  }

  try {
    console.log(`Controller: Received request for folder: ${folderName}`);
    const imageObjects = await getImagesFromFolder(folderName); // This is CloudinaryResource[]
    // Always return 200 OK. If no images, imageObjects will be an empty array.
    res.status(200).json(imageObjects);
  } catch (error) {
    console.error(`Controller: Error fetching images for folder ${folderName}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Send a 500 Internal Server Error for actual errors from the service
    res.status(500).json({ message: 'Error fetching images from Cloudinary.', error: errorMessage });
  }
}; 