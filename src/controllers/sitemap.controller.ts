import { Request, Response } from 'express';
import { generateSitemap, generateRobotsTxt } from '../services/sitemap.service.js';

/**
 * Controller to serve sitemap.xml
 */
export const serveSitemap = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[SitemapController] Generating sitemap.xml');
    
    // Determine base URL from request
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('Host');
    const baseUrl = `${protocol}://${host}`;
    
    const sitemap = await generateSitemap(baseUrl);
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('[SitemapController] Error generating sitemap:', error);
    res.status(500).json({
      message: 'Error generating sitemap',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Controller to serve robots.txt
 */
export const serveRobotsTxt = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[SitemapController] Generating robots.txt');
    
    // Determine base URL from request
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('Host');
    const baseUrl = `${protocol}://${host}`;
    
    const robotsTxt = generateRobotsTxt(baseUrl);
    
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.status(200).send(robotsTxt);
  } catch (error) {
    console.error('[SitemapController] Error generating robots.txt:', error);
    res.status(500).json({
      message: 'Error generating robots.txt',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}; 