import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

// Create a rate limiter for posts (max 5 posts per minute)
const postRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many posts created from this IP, please try again later.',
});

// Create a rate limiter for likes (max 10 likes per minute)
const likeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 likes per windowMs
  message: 'Too many likes from this IP, please try again later.',
});

// Post schema validation using Zod
const createPostSchema = z.object({
  content: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  type: z.enum(['text', 'image', 'video']).default('text'),
});

const commentSchema = z.object({
  content: z.string().min(1),
});

// Get posts feed with filters and pagination
router.get('/posts', isAuthenticated, async (req, res) => {
  try {
    const { filter = 'recent', page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let posts;
    switch (filter) {
      case 'trending':
        posts = await storage.getTrendingPosts(Number(limit), offset);
        break;
      case 'following':
        posts = await storage.getFollowingPosts(req.user!.id, Number(limit), offset);
        break;
      default:
        posts = await storage.getRecentPosts(Number(limit), offset);
    }

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const likes = await storage.getPostLikes(post.id);
        const comments = await storage.getPostComments(post.id);
        const shares = await storage.getPostShares(post.id);

        return {
          ...post,
          user: {
            id: user.id,
            name: user.fullName || user.username,
            avatar: user.avatar,
          },
          likes: likes.length,
          comments: comments.length,
          shares: shares.length,
          liked: likes.some((like) => like.userId === req.user!.id),
          shared: shares.some((share) => share.userId === req.user!.id),
        };
      })
    );

    res.json(postsWithMeta);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// Create post with rate limiting
router.post('/posts', isAuthenticated, postRateLimiter, async (req, res) => {
  try {
    const data = createPostSchema.parse(req.body);
    const post = await storage.createPost({
      userId: req.user!.id,
      ...data,
    });

    const user = await storage.getUser(post.userId);

    res.status(201).json({
      ...post,
      user: {
        id: user.id,
        name: user.fullName || user.username,
        avatar: user.avatar,
      },
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      shared: false,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// Like/Unlike post with rate limiting
router.post('/posts/:postId/like', isAuthenticated, likeRateLimiter, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;
    
    const liked = await storage.togglePostLike(postId, userId);
    res.json({ liked });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Failed to toggle like' });
  }
});

// Share post
router.post('/posts/:postId/share', isAuthenticated, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user!.id;
    
    const shared = await storage.sharePost(postId, userId);
    res.json({ shared });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ message: 'Failed to share post' });
  }
});

// Add comment
router.post('/posts/:postId/comments', isAuthenticated, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const data = commentSchema.parse(req.body);
    
    const comment = await storage.createComment({
      postId,
      userId: req.user!.id,
      content: data.content,
    });

    const user = await storage.getUser(comment.userId);
    
    res.status(201).json({
      ...comment,
      user: {
        id: user.id,
        name: user.fullName || user.username,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

export default router;
