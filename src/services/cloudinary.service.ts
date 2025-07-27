import cloudinary from '../config/cloudinary.config.js';

// Define the expected structure for a Cloudinary resource, similar to frontend's CloudinaryImage
interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  created_at?: string;
  metadata?: Record<string, any>; // Add metadata field
  // Add other properties if they exist on the resource and you need them
}

interface CacheEntry {
  images: CloudinaryResource[];
  timestamp: number;
}

// In-memory cache
const imageCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches image details from a specified folder in Cloudinary, with caching.
 * @param folderName The name of the folder in Cloudinary.
 * @returns A promise that resolves to an array of CloudinaryResource objects.
 * @throws Error if there's an issue fetching from Cloudinary.
 */
export const getImagesFromFolder = async (folderName: string): Promise<CloudinaryResource[]> => {
  const now = Date.now();
  if (imageCache.has(folderName)) {
    const cachedEntry = imageCache.get(folderName)!;
    if (now - cachedEntry.timestamp < CACHE_DURATION_MS) {
      console.log(`[CloudinaryService] Returning cached images for folder: ${folderName}`);
      return cachedEntry.images;
    }
  }

  try {
    console.log(`[CloudinaryService] Fetching images for folder: ${folderName}`);
    const result = await cloudinary.search
      .expression(`folder:${folderName} AND resource_type:image`)
      .sort_by('public_id', 'desc')
      .max_results(500)
      .with_field('context')
      .execute();

    if (result && result.resources) {
      const images: CloudinaryResource[] = result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        created_at: resource.created_at,
        metadata: resource.context || {},
      }));

      // Store in cache
      imageCache.set(folderName, { images, timestamp: now });
      console.log(`[CloudinaryService] Found and cached ${images.length} image(s) for ${folderName}.`);
      return images;
    }

    // If no resources are found, cache an empty array to prevent repeated calls for empty folders
    imageCache.set(folderName, { images: [], timestamp: now });
    console.log(`[CloudinaryService] No resources found for folder: ${folderName}. Cached empty result.`);
    return [];
  } catch (error) {
    console.error(`[CloudinaryService] Error fetching images from Cloudinary for folder ${folderName}:`, error);
    if (error instanceof Error) {
      throw new Error(`Cloudinary API error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching images from Cloudinary.');
  }
};

/**
 * Fetches photography images from nested folder structure: photography/YYYY_Topic
 * @returns A promise that resolves to an array of CloudinaryResource objects with parsed metadata.
 * @throws Error if there's an issue fetching from Cloudinary.
 */
export const getPhotographyImages = async (): Promise<CloudinaryResource[]> => {
  const now = Date.now();
  const cacheKey = 'photography_all';
  
  if (imageCache.has(cacheKey)) {
    const cachedEntry = imageCache.get(cacheKey)!;
    if (now - cachedEntry.timestamp < CACHE_DURATION_MS) {
      console.log(`[CloudinaryService] Returning cached photography images`);
      return cachedEntry.images;
    }
  }

  try {
    console.log(`[CloudinaryService] Fetching all photography images with nested folder structure`);
    
    // First, get all folders in the photography directory
    const foldersResult = await cloudinary.api.sub_folders('photography');
    
    if (!foldersResult || !foldersResult.folders) {
      console.log(`[CloudinaryService] No photography folders found`);
      imageCache.set(cacheKey, { images: [], timestamp: now });
      return [];
    }

    const allImages: CloudinaryResource[] = [];
    
    // Process each folder (YYYY_Topic structure)
    for (const folder of foldersResult.folders) {
      const folderName = folder.name;
      const fullFolderPath = `photography/${folderName}`;
      
      console.log(`[CloudinaryService] Processing photography folder: ${fullFolderPath}`);
      
      // Parse folder name to extract year and topic
      const folderParts = folderName.split('_');
      let year = 'Unknown';
      let topic = 'Unknown';
      
      if (folderParts.length >= 2) {
        year = folderParts[0];
        topic = folderParts.slice(1).join('_'); // In case topic has underscores
      }
      
      // Fetch images from this specific folder
      const result = await cloudinary.search
        .expression(`folder:${fullFolderPath} AND resource_type:image`)
        .sort_by('public_id', 'desc')
        .max_results(500)
        .with_field('context')
        .execute();

      if (result && result.resources) {
        const folderImages: CloudinaryResource[] = result.resources.map((resource: any) => ({
          public_id: resource.public_id,
          secure_url: resource.secure_url,
          width: resource.width,
          height: resource.height,
          format: resource.format,
          created_at: resource.created_at,
          metadata: {
            ...resource.context,
            year: year,
            topic: topic,
            folder: folderName,
            category: topic, // Use topic as category for frontend filtering
          },
        }));
        
        allImages.push(...folderImages);
        console.log(`[CloudinaryService] Found ${folderImages.length} images in ${fullFolderPath}`);
      }
    }
    
    // Sort all images by year (newest first) and then by created_at (newest first) within each year
    allImages.sort((a, b) => {
      const yearA = parseInt(a.metadata?.year || '0');
      const yearB = parseInt(b.metadata?.year || '0');
      
      // First sort by year (descending - newest first)
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      
      // Within same year, sort by created_at (newest first)
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    console.log(`[CloudinaryService] Sorted ${allImages.length} images by year (newest first)`);
    
    // Store in cache
    imageCache.set(cacheKey, { images: allImages, timestamp: now });
    console.log(`[CloudinaryService] Found and cached ${allImages.length} total photography images`);
    return allImages;
    
  } catch (error) {
    console.error(`[CloudinaryService] Error fetching photography images:`, error);
    if (error instanceof Error) {
      throw new Error(`Cloudinary API error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching photography images from Cloudinary.');
  }
}; 