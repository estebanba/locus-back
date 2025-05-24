import { Request, Response } from 'express';
import { getDataFile, getWorkData, getWorkItemImages } from '../services/data.service';
import path from 'path';

// List of allowed data file names to prevent arbitrary file access
const ALLOWED_DATA_FILES = ['projects.json', 'photos.json', 'work.json'];

/**
 * Controller to handle requests for fetching generic JSON data files.
 */
export const serveDataFile = async (req: Request, res: Response): Promise<void> => {
  const fileName = req.params.fileName;

  if (!fileName) {
    res.status(400).json({ message: 'File name parameter is required.' });
    return;
  }

  // Sanitize fileName to prevent directory traversal
  const sanitizedFileName = path.basename(fileName);

  if (!ALLOWED_DATA_FILES.includes(sanitizedFileName)) {
    res.status(403).json({ message: `Access to file '${sanitizedFileName}' is not allowed.` });
    return;
  }

  try {
    console.log(`Controller: Received request for data file: ${sanitizedFileName}`);
    // If the request is specifically for work.json, it will now also return stripped data
    // as getWorkData() is the one that fetches and processes it initially.
    // For simplicity, we let /api/data/work handle the primary processed work data.
    // This /api/data/:fileName route for 'work.json' would give stripped data.
    if (sanitizedFileName === 'work.json') {
      const data = await getWorkData(); // Returns work data without images/imageFolders
      res.status(200).json(data);
    } else {
      // For other allowed files, use the generic getDataFile
      const data = await getDataFile(sanitizedFileName);
      res.status(200).json(data);
    }
  } catch (error) {
    console.error(`Controller: Error serving data file ${sanitizedFileName}:`, error);
    if (error instanceof Error && error.message.startsWith('Could not load data file')) {
        res.status(404).json({ message: `Data file '${sanitizedFileName}' not found.` });
    } else {
        res.status(500).json({ message: `Error serving data file '${sanitizedFileName}'.` });
    }
  }
};

/**
 * Controller to specifically handle requests for 'work.json' data,
 * processed to exclude image arrays.
 */
export const serveWorkData = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Controller: Received request for processed work data (details only).`);
    const data = await getWorkData(); // This now returns data without any image arrays
    res.status(200).json(data);
  } catch (error) {
    console.error(`Controller: Error serving processed work data:`, error);
    res.status(500).json({ message: 'Error serving processed work data.' });
  }
};

/**
 * Controller to handle requests for fetching image URLs of a specific work item.
 */
export const serveWorkItemImages = async (req: Request, res: Response): Promise<void> => {
  const workItemTitle = req.params.title;

  if (!workItemTitle) {
    res.status(400).json({ message: 'Work item title parameter is required.' });
    return;
  }

  try {
    console.log(`Controller: Received request for images of work item: ${workItemTitle}`);
    // Decoding the title in case it has URL-encoded characters
    const decodedTitle = decodeURIComponent(workItemTitle);
    const images = await getWorkItemImages(decodedTitle);
    res.status(200).json(images);
  } catch (error) {
    console.error(`Controller: Error serving images for work item '${workItemTitle}':`, error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ message: `Images for work item '${workItemTitle}' not found.` });
    } else {
      res.status(500).json({ message: `Error serving images for work item '${workItemTitle}'.` });
    }
  }
}; 