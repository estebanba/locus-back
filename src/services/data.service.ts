import fs from 'fs/promises';
import path from 'path';
import { getImagesFromFolder } from './cloudinary.service';

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

// Use absolute paths based on the current file's location
console.log(`[DATA_SERVICE_TS_TOP_LEVEL] Current __dirname: ${__dirname}`);
const dataFolderPath = path.join(__dirname, '..', 'data');
console.log(`[DATA_SERVICE_TS_TOP_LEVEL] Resolved dataFolderPath: ${dataFolderPath}`);

/**
 * Reads and parses a JSON data file from the data directory.
 * @param fileName The name of the JSON file (e.g., 'projects.json').
 * @returns A promise that resolves to the parsed JSON data.
 * @throws Error if the file cannot be read or parsed.
 */
export const getDataFile = async (fileName: string): Promise<GenericData | WorkData> => {
  // !! AGGRESSIVE LOGGING FOR DEBUGGING PATHS !!
  console.log(`[getDataFile] Called for fileName: ${fileName}`);
  console.log(`[getDataFile] Current __dirname: ${__dirname}`);
  const filePath = path.join(dataFolderPath, fileName);
  console.log(`[getDataFile] Attempting to read filePath: ${filePath}`);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    console.log(`Successfully read and parsed ${fileName} from ${filePath}`);
    return jsonData;
  } catch (error) {
    console.error(`Error reading or parsing data file ${fileName} from ${filePath}:`, error);
    throw new Error(`Could not load data file: ${fileName}`);
  }
};

/**
 * Fetches work data from work.json and processes image folder paths.
 * For each work item, if an image entry is a string (folder path),
 * it fetches the image URLs from Cloudinary and replaces the path.
 * @returns A promise that resolves to the processed work data.
 */
export const getWorkData = async (): Promise<WorkData> => {
  const workItems = await getDataFile('work.json') as WorkData;
  console.log('[DataService] Initial workItems loaded for getWorkData (full, before stripping):', JSON.stringify(workItems, null, 2));

  const processedWorkItems = workItems.map(item => {
    // Destructure to get item properties, then explicitly exclude images and imageFolders
    const { images, imageFolders, ...itemWithoutImageArrays } = item;
    // Log what's being stripped for clarity, if needed
    // console.log(`[DataService] Stripping image arrays from: ${item.title}`);
    return itemWithoutImageArrays as WorkItem; // Cast back to WorkItem, assuming the rest of the fields match
  });

  console.log('[DataService] Finished processing work data for getWorkData (stripped). ProcessedWorkItems:', JSON.stringify(processedWorkItems, null, 2));
  return processedWorkItems;
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