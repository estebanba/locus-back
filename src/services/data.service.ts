import fs from 'fs/promises';
import path from 'path';
import { getImagesFromFolder } from './cloudinary.service';

// Base path for data files - handle both dev and prod correctly
const isDevelopment = process.env.NODE_ENV !== 'production';
const isRunningWithTsNode = process.env.TS_NODE_DEV === 'true' || !!process.env.TS_NODE_DEV;

// In development, use src/data
// In production, first try the configured production path, then fall back to dist/data
const getBasePath = async () => {
  if (isDevelopment) {
    return path.join(process.cwd(), 'src', 'data');
  }

  // In production, try paths in order:
  const prodPaths = [
    '/var/www/locus-backend/dist/data',           // New direct path
    path.join(process.cwd(), 'dist', 'data'),     // Fallback to local dist/data
  ];

  for (const prodPath of prodPaths) {
    try {
      await fs.access(prodPath);
      console.log(`[DataService] Found valid data path: ${prodPath}`);
      return prodPath;
    } catch (err) {
      console.log(`[DataService] Path ${prodPath} not accessible, trying next...`);
    }
  }

  // If no paths work, throw error
  throw new Error('Could not find valid data directory in production');
};

// Initialize BASE_PATH
let BASE_PATH = '';

// Function to initialize the service
export const initializeDataService = async () => {
  try {
    BASE_PATH = await getBasePath();
    console.log(`[DataService] Environment: ${process.env.NODE_ENV}`);
    console.log(`[DataService] Running with ts-node: ${isRunningWithTsNode}`);
    console.log(`[DataService] Current working directory: ${process.cwd()}`);
    console.log(`[DataService] Using BASE_PATH: ${BASE_PATH}`);
  } catch (error) {
    console.error('[DataService] Failed to initialize data service:', error);
    throw error;
  }
};

// Call initialize immediately
initializeDataService().catch(console.error);

// Defines the expected structure of an item in the work.json data
interface WorkItem {
  title: string;
  summary: string;
  details: string[];
  techStack: string[];
  features: string[];
  type: string;
  labels: string[];
  company: string | null;
  dateFrom: string;
  dateUntil: string | null;
  url: string | null;
  images: string[]; // Will store final array of image URLs
  imageFolders?: string[]; // Optional: for Cloudinary folder paths
  media: { name: string; url: string }[];
  github: string | null;
  // Allow any other properties that might exist
  [key: string]: any;
}

// Defines the expected structure of the work.json data
type WorkData = WorkItem[];

// Defines the structure for other generic JSON data files
interface GenericData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Reads and parses a JSON data file from the data directory.
 * @param fileName The name of the JSON file (e.g., 'projects.json').
 * @returns A promise that resolves to the parsed JSON data.
 * @throws Error if the file cannot be read or parsed.
 */
export const getDataFile = async (fileName: string): Promise<GenericData | WorkData> => {
  // Ensure BASE_PATH is initialized
  if (!BASE_PATH) {
    await initializeDataService();
  }

  const filePath = path.join(BASE_PATH, fileName);
  console.log(`[getDataFile] Environment: ${process.env.NODE_ENV}`);
  console.log(`[getDataFile] Base Path: ${BASE_PATH}`);
  console.log(`[getDataFile] Attempting to read file: ${filePath}`);
  
  try {
    // First check if file exists
    try {
      await fs.access(filePath);
      console.log(`[getDataFile] File exists at ${filePath}`);
    } catch (err) {
      console.error(`[getDataFile] File does not exist at ${filePath}`);
      throw new Error(`File not found: ${fileName} at ${filePath}`);
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log(`[getDataFile] Successfully read file content from ${filePath}`);
    
    try {
      const jsonData = JSON.parse(fileContent);
      console.log(`[getDataFile] Successfully parsed JSON from ${fileName}`);
      return jsonData;
    } catch (parseError) {
      console.error(`[getDataFile] Error parsing JSON from ${fileName}:`, parseError);
      throw new Error(`Invalid JSON in file: ${fileName}`);
    }
  } catch (error) {
    console.error(`[getDataFile] Error processing file ${fileName} from ${filePath}:`, error);
    throw error;
  }
};

/**
 * Fetches work data from work.json and processes image folder paths.
 * For each work item, if an image entry is a string (folder path),
 * it fetches the image URLs from Cloudinary and replaces the path.
 * @returns A promise that resolves to the processed work data.
 */
export const getWorkData = async (): Promise<WorkData> => {
  try {
    // Log environment and path information
    console.log(`[getWorkData] Environment: ${process.env.NODE_ENV}`);
    console.log(`[getWorkData] Base Path: ${BASE_PATH}`);
    
    // Get the raw work data
    const workItems = await getDataFile('work.json') as WorkData;
    console.log('[getWorkData] Successfully loaded work.json');

    // Safely process each work item
    const processedWorkItems = workItems.map(item => {
      try {
        // Create a new object with all properties except images and imageFolders
        const { 
          images = [], // Default to empty array if undefined
          imageFolders = [], // Default to empty array if undefined
          ...rest 
        } = item;

        // Return the processed item with type safety
        return {
          ...rest,
          images: [], // Initialize with empty array
          imageFolders: [] // Initialize with empty array
        } as WorkItem;
      } catch (itemError) {
        console.error(`[getWorkData] Error processing work item:`, itemError);
        // Return a minimal valid work item if processing fails
        return {
          title: item.title || 'Unknown',
          summary: item.summary || '',
          details: [],
          techStack: [],
          features: [],
          type: '',
          labels: [],
          company: null,
          dateFrom: '',
          dateUntil: null,
          url: null,
          images: [],
          media: [],
          github: null
        } as WorkItem;
      }
    });

    console.log(`[getWorkData] Successfully processed ${processedWorkItems.length} work items`);
    return processedWorkItems;
  } catch (error) {
    console.error('[getWorkData] Error fetching or processing work data:', error);
    throw new Error('Error serving processed work data.');
  }
};

/**
 * Fetches and processes image URLs for a specific work item.
 * @param workItemTitle The title of the work item.
 * @returns A promise that resolves to an array of image URLs.
 * @throws Error if the work item is not found or if there's an issue fetching images.
 */
export const getWorkItemImages = async (workItemTitle: string): Promise<string[]> => {
  const workItems = await getDataFile('work.json') as WorkData;
  const item = workItems.find(i => i.title === workItemTitle);

  if (!item) {
    console.error(`[DataService] Work item with title '${workItemTitle}' not found for getWorkItemImages.`);
    throw new Error(`Work item with title '${workItemTitle}' not found.`);
  }

  console.log(`[DataService] Found item '${workItemTitle}' for image processing:`, JSON.stringify(item, null, 2));

  const initialImages: string[] = Array.isArray(item.images) ? [...item.images] : [];
  const cloudinaryImageUrls: string[] = [];

  // Use item.imagesPath and item.name if available, otherwise fall back to imageFolders
  // This function might be evolving or deprecated given new frontend fetching
  let folderToFetchFrom = '';
  if (item.imagesPath && item.name) {
    folderToFetchFrom = item.imagesPath + item.name; 
  } else if (item.imageFolders && Array.isArray(item.imageFolders) && item.imageFolders.length > 0) {
    // Fallback to old imageFolders logic if new properties aren't there (should be removed if imageFolders is gone)
    console.warn(`[DataService] Item '${item.title}' using legacy imageFolders. Consider updating to imagesPath and name.`);
    folderToFetchFrom = item.imageFolders[0]; // Or iterate if multiple were supported
  }

  if (folderToFetchFrom && typeof folderToFetchFrom === 'string' && folderToFetchFrom.trim() !== '') {
    try {
      console.log(`[DataService] Calling getImagesFromFolder for: ${folderToFetchFrom}`);
      const imageResources = await getImagesFromFolder(folderToFetchFrom); // Returns CloudinaryResource[]
      console.log(`[DataService] Cloudinary resources for '${folderToFetchFrom}':`, imageResources.length);
      // Map CloudinaryResource objects to their secure_url strings
      const imageUrlStrings = imageResources.map(resource => resource.secure_url);
      cloudinaryImageUrls.push(...imageUrlStrings);
    } catch (error) {
      console.error(`[DataService] Error calling getImagesFromFolder for ${folderToFetchFrom} in item '${item.title}':`, error);
    }
  } else if (item.imageFolders && Array.isArray(item.imageFolders)) {
    // This block is for the old iteration logic if needed, but priority is imagesPath + name
    console.log(`[DataService] Item '${item.title}' has imageFolders (legacy path):`, item.imageFolders);
    for (const folderPath of item.imageFolders) {
      if (typeof folderPath === 'string' && folderPath.trim() !== '') {
        try {
          console.log(`[DataService] (Legacy) Calling getImagesFromFolder for: ${folderPath}`);
          const legacyImageResources = await getImagesFromFolder(folderPath);
          const legacyImageUrlStrings = legacyImageResources.map(resource => resource.secure_url);
          cloudinaryImageUrls.push(...legacyImageUrlStrings);
        } catch (error) {
          console.error(`[DataService] (Legacy) Error calling getImagesFromFolder for ${folderPath} in item '${item.title}':`, error);
        }
      }
    }
  }

  const finalImages: string[] = [...initialImages, ...cloudinaryImageUrls];
  console.log(`[DataService] Final images for '${item.title}':`, finalImages);
  return finalImages;
}; 