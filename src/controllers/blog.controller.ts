import { Request, Response } from 'express';
import { 
  getBlogPosts, 
  getBlogPost, 
  getBlogPostsByTag, 
  getBlogTags 
} from '../services/blog.service.js';

/**
 * Controller to handle requests for fetching all blog posts
 */
export const serveBlogPosts = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[BlogController] Received request for all blog posts');
    const posts = await getBlogPosts();
    res.status(200).json(posts);
  } catch (error) {
    console.error('[BlogController] Error serving blog posts:', error);
    res.status(500).json({
      message: 'Error serving blog posts',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Controller to handle requests for fetching a single blog post by slug
 */
export const serveBlogPost = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  if (!slug) {
    res.status(400).json({ message: 'Blog post slug parameter is required.' });
    return;
  }

  try {
    console.log(`[BlogController] Received request for blog post: ${slug}`);
    const post = await getBlogPost(slug);
    
    if (!post) {
      res.status(404).json({ message: `Blog post '${slug}' not found.` });
      return;
    }

    res.status(200).json(post);
  } catch (error) {
    console.error(`[BlogController] Error serving blog post '${slug}':`, error);
    res.status(500).json({
      message: `Error serving blog post '${slug}'`,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Controller to handle requests for fetching blog posts by tag
 */
export const serveBlogPostsByTag = async (req: Request, res: Response): Promise<void> => {
  const { tag } = req.params;

  if (!tag) {
    res.status(400).json({ message: 'Tag parameter is required.' });
    return;
  }

  try {
    console.log(`[BlogController] Received request for blog posts with tag: ${tag}`);
    const posts = await getBlogPostsByTag(tag);
    res.status(200).json(posts);
  } catch (error) {
    console.error(`[BlogController] Error serving blog posts for tag '${tag}':`, error);
    res.status(500).json({
      message: `Error serving blog posts for tag '${tag}'`,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Controller to handle requests for fetching all blog tags
 */
export const serveBlogTags = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[BlogController] Received request for blog tags');
    const tags = await getBlogTags();
    res.status(200).json(tags);
  } catch (error) {
    console.error('[BlogController] Error serving blog tags:', error);
    res.status(500).json({
      message: 'Error serving blog tags',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}; 