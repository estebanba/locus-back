import { Request, Response } from 'express';
import { getImagesFromFolder } from '../services/cloudinary.service';

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
    const imageUrls = await getImagesFromFolder(folderName);
    if (imageUrls.length > 0) {
      res.status(200).json(imageUrls);
    } else {
      res.status(404).json({ message: `No images found in folder '${folderName}' or folder does not exist.` });
    }
  } catch (error) {
    console.error(`Controller: Error fetching images for folder ${folderName}:`, error);
    // Check if the error is an instance of Error to access its message property safely
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ message: 'Error fetching images from Cloudinary.', error: errorMessage });
  }
}; 