import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// Configure marked for better security and performance
marked.setOptions({
  gfm: true,
  breaks: false,
});

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author?: string;
  date: string;
  tags?: string[];
  image?: string; // Keep for backward compatibility
  images?: string[]; // New array structure like work/projects
  imagesPath?: string; // New path structure like work/projects
  content: string;
  excerpt: string;
  readingTime: number;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  socialImage?: string;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  author?: string;
  date: string;
  tags?: string[];
  image?: string; // Keep for backward compatibility
  images?: string[]; // New array structure like work/projects
  imagesPath?: string; // New path structure like work/projects
  excerpt: string;
  readingTime: number;
  socialImage?: string; // For tooltips
}

// Get the blog directory path
const getBlogPath = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    return path.join(process.cwd(), 'src', 'data', 'blog');
  }
  // In production, try different paths
  const prodPaths = [
    '/var/www/locus-back/dist/data/blog',
    path.join(process.cwd(), 'dist', 'data', 'blog'),
  ];

  // Return first existing path (we'll validate existence in individual functions)
  return prodPaths[0]; // Default to first option
};

/**
 * Calculate estimated reading time based on word count
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Generate excerpt from content
 */
function generateExcerpt(content: string, maxLength = 160): string {
  // Remove markdown formatting and HTML tags
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}

/**
 * Get all blog post summaries (for listing pages)
 */
export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  const blogPath = getBlogPath();
  
  try {
    await fs.access(blogPath);
  } catch {
    console.warn(`[BlogService] Blog directory not found: ${blogPath}`);
    return [];
  }

  try {
    const files = await fs.readdir(blogPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = path.join(blogPath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        const slug = file.replace('.md', '');
        const excerpt = data.excerpt || generateExcerpt(content);
        const readingTime = calculateReadingTime(content);

        return {
          slug,
          title: data.title || slug,
          description: data.description || excerpt,
          author: data.author,
          date: data.date,
          tags: data.tags || [],
          image: data.image, // Keep for backward compatibility
          images: data.images || [], // New array structure
          imagesPath: data.imagesPath, // New path structure
          name: data.name, // For Cloudinary folder path
          excerpt,
          readingTime,
          socialImage: data.socialImage || data.image, // For tooltips
        } as BlogPostSummary;
      })
    );

    // Sort by date (newest first)
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('[BlogService] Error reading blog posts:', error);
    return [];
  }
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const blogPath = getBlogPath();
  const filePath = path.join(blogPath, `${slug}.md`);

  try {
    await fs.access(filePath);
  } catch {
    console.warn(`[BlogService] Blog post not found: ${filePath}`);
    return null;
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    const excerpt = data.excerpt || generateExcerpt(content);
    const readingTime = calculateReadingTime(content);

    return {
      slug,
      title: data.title || slug,
      description: data.description || excerpt,
      author: data.author,
      date: data.date,
      tags: data.tags || [],
      image: data.image, // Keep for backward compatibility
      images: data.images || [],
      imagesPath: data.imagesPath,
      name: data.name, // For Cloudinary folder path
      content: marked(content) as string,
      excerpt,
      readingTime,
      // SEO fields
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || data.description || excerpt,
      canonicalUrl: data.canonicalUrl,
      socialImage: data.socialImage || data.image, // Keep for backward compatibility
    } as BlogPost;
  } catch (error) {
    console.error(`[BlogService] Error reading blog post for slug '${slug}':`, error);
    return null;
  }
}

/**
 * Get blog posts by tag
 */
export async function getBlogPostsByTag(tag: string): Promise<BlogPostSummary[]> {
  const allPosts = await getBlogPosts();
  return allPosts.filter(post => 
    post.tags && post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get all unique tags
 */
export async function getBlogTags(): Promise<string[]> {
  const allPosts = await getBlogPosts();
  const tagSet = new Set<string>();
  
  allPosts.forEach(post => {
    if (post.tags) {
      post.tags.forEach(tag => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
} 