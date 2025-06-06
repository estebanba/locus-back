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

/**
 * Fetches image details from a specified folder in Cloudinary.
 * @param folderName The name of the folder in Cloudinary.
 * @returns A promise that resolves to an array of CloudinaryResource objects.
 * @throws Error if there's an issue fetching from Cloudinary.
 */
export const getImagesFromFolder = async (folderName: string): Promise<CloudinaryResource[]> => {
  try {
    console.log(`[CloudinaryService] Fetching images for folder: ${folderName}`);
    const result = await cloudinary.search
      .expression(`folder:${folderName} AND resource_type:image`)
      .sort_by('public_id', 'desc') // Optional: sort by public_id, created_at, etc.
      .max_results(500)
      .with_field('context') // Request contextual metadata
      .execute();

    console.log(`[CloudinaryService] API Result for folder ${folderName}:`, JSON.stringify(result, null, 2));

    if (result && result.resources && result.resources.length > 0) {
      const images: CloudinaryResource[] = result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        created_at: resource.created_at,
        metadata: resource.context || {} // Include contextual metadata
      }));
      console.log(`[CloudinaryService] Found image details for ${folderName}:`, images.length);
      return images;
    } else {
      console.log(`[CloudinaryService] No resources found for folder: ${folderName}. Attempting to create folder.`);
      try {
        await cloudinary.api.create_folder(folderName);
        console.log(`[CloudinaryService] Successfully created folder: ${folderName}`);
        return []; // Return empty array as the folder was just created
      } catch (creationError) {
        console.error(`[CloudinaryService] Failed to create folder ${folderName}:`, creationError);
        // If folder creation fails, we still return an empty array or re-throw depending on desired behavior.
        // For now, let's just log and return empty, as the initial search also found nothing.
        return [];
      }
    }
  } catch (error) {
    console.error(`[CloudinaryService] Error fetching images from Cloudinary for folder ${folderName}:`, error);
    // Throw the error to be handled by the controller
    // This allows the controller to send a more specific error response (e.g., 500)
    if (error instanceof Error) {
      throw new Error(`Cloudinary API error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching images from Cloudinary.');
  }
}; 