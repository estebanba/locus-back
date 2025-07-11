import { getBlogPosts } from './blog.service';

export interface SitemapUrl {
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate XML sitemap including all pages and blog posts
 */
export async function generateSitemap(baseUrl: string): Promise<string> {
  const urls: SitemapUrl[] = [];

  // Static pages with priorities
  const staticPages = [
    { path: '', priority: 1.0, changeFreq: 'monthly' as const },
    { path: 'about', priority: 0.8, changeFreq: 'monthly' as const },
    { path: 'work', priority: 0.9, changeFreq: 'weekly' as const },
    { path: 'projects', priority: 0.9, changeFreq: 'weekly' as const },
    { path: 'photography', priority: 0.7, changeFreq: 'monthly' as const },
    { path: 'timeline', priority: 0.6, changeFreq: 'monthly' as const },
    { path: 'skillset', priority: 0.6, changeFreq: 'monthly' as const },
    { path: 'blog', priority: 0.9, changeFreq: 'daily' as const },
  ];

  // Add static pages
  staticPages.forEach(page => {
    urls.push({
      url: `${baseUrl}/${page.path}`,
      changeFrequency: page.changeFreq,
      priority: page.priority,
      lastModified: new Date().toISOString().split('T')[0], // Today's date
    });
  });

  // Add blog posts
  try {
    const blogPosts = await getBlogPosts();
    blogPosts.forEach(post => {
      urls.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.date,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('[SitemapService] Error fetching blog posts for sitemap:', error);
    // Continue without blog posts if there's an error
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlObj => `  <url>
    <loc>${escapeXml(urlObj.url)}</loc>
    ${urlObj.lastModified ? `    <lastmod>${urlObj.lastModified}</lastmod>` : ''}
    ${urlObj.changeFrequency ? `    <changefreq>${urlObj.changeFrequency}</changefreq>` : ''}
    ${urlObj.priority ? `    <priority>${urlObj.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin or private paths if any
# Disallow: /admin/
# Disallow: /private/
`;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
} 