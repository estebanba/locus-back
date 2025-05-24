import cloudinary from '../config/cloudinary.config';

/**
 * Fetches image URLs from a specified folder in Cloudinary.
 * @param folderName The name of the folder in Cloudinary.
 * @returns A promise that resolves to an array of image URLs.
 * @throws Error if there's an issue fetching from Cloudinary or the folder is not found/empty.
 */
export const getImagesFromFolder = async (folderName: string): Promise<string[]> => {
  try {
    console.log(`[CloudinaryService] Fetching images for folder: ${folderName}`);
    const result = await cloudinary.search
      .expression(`folder:${folderName} AND resource_type:image`)
      .max_results(500) // Adjust as needed, max is 500 for search API without cursor
      .execute();

    console.log(`[CloudinaryService] API Result for folder ${folderName}:`, JSON.stringify(result, null, 2));

    if (result && result.resources && result.resources.length > 0) {
      const urls = result.resources.map((resource: { secure_url: string; }) => resource.secure_url);
      console.log(`[CloudinaryService] Found URLs for ${folderName}:`, urls);
      return urls;
    } else {
      console.log(`[CloudinaryService] No resources found for folder: ${folderName}. Result:`, result);
      return []; // Return empty array if no resources or result is unexpected
    }
  } catch (error) {
    console.error(`[CloudinaryService] Error fetching images from Cloudinary for folder ${folderName}:`, error);
    // It might be better to throw the error or return a specific error indicator
    // For now, returning an empty array to avoid breaking the flow, but indicates failure.
    return []; 
  }
}; 