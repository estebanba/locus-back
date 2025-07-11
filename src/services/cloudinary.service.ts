import cloudinary from '../config/cloudinary.config';

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