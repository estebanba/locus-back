import { Router } from 'express';
import { 
  serveBlogPosts, 
  serveBlogPost, 
  serveBlogPostsByTag, 
  serveBlogTags 
} from '../controllers/blog.controller.js';

const router = Router();

/**
 * @swagger
 * /api/blog:
 *   get:
 *     summary: Retrieve all blog posts summaries
 *     description: Fetches a list of all blog posts with summary information (no full content)
 *     responses:
 *       200:
 *         description: Array of blog post summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BlogPostSummary'
 *       500:
 *         description: Error fetching blog posts
 */
router.get('/', serveBlogPosts);

/**
 * @swagger
 * /api/blog/tags:
 *   get:
 *     summary: Retrieve all unique blog tags
 *     description: Fetches a list of all unique tags used across blog posts
 *     responses:
 *       200:
 *         description: Array of unique tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Error fetching blog tags
 */
router.get('/tags', serveBlogTags);

/**
 * @swagger
 * /api/blog/tag/{tag}:
 *   get:
 *     summary: Retrieve blog posts by tag
 *     description: Fetches all blog posts that have a specific tag
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         description: The tag to filter blog posts by
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of blog post summaries with the specified tag
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BlogPostSummary'
 *       400:
 *         description: Tag parameter is required
 *       500:
 *         description: Error fetching blog posts for tag
 */
router.get('/tag/:tag', serveBlogPostsByTag);

/**
 * @swagger
 * /api/blog/{slug}:
 *   get:
 *     summary: Retrieve a specific blog post by slug
 *     description: Fetches a single blog post with full content by its slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: The slug of the blog post to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full blog post data including content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogPost'
 *       400:
 *         description: Blog post slug parameter is required
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Error fetching blog post
 */
router.get('/:slug', serveBlogPost);

export default router; 