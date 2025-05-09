import {
  users, posts, comments, likes, books, follows, aiContents, projects, projectComponents, subscriptionPlans,
  type User, type InsertUser, type Post, type Comment, type Like, type Book, type Follow,
  type AiContent, type InsertAiContent, type Project, type InsertProject,
  type ProjectComponent, type InsertProjectComponent, type SubscriptionPlan, type InsertSubscriptionPlan
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from "dotenv";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<User, "id" | "password">>): Promise<User>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  updateStripeSubscriptionInfo(userId: number, subscriptionInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User>;

  // Posts methods
  createPost(post: { userId: number; content: string; mediaUrl?: string }): Promise<Post>;
  getPostById(id: number): Promise<Post | undefined>;
  getAllPosts(limit?: number, offset?: number): Promise<Post[]>;
  getUserPosts(userId: number): Promise<Post[]>;

  // Comments methods
  createComment(comment: { postId: number; userId: number; content: string }): Promise<Comment>;
  getPostComments(postId: number): Promise<Comment[]>;

  // Likes methods
  createLike(like: { postId: number; userId: number }): Promise<Like>;
  deleteLike(postId: number, userId: number): Promise<void>;
  getPostLikes(postId: number): Promise<Like[]>;

  // Books methods
  getAllBooks(category?: string, limit?: number, offset?: number): Promise<Book[]>;
  getBookById(id: number): Promise<Book | undefined>;

  // Follow methods
  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getUserFollowers(userId: number): Promise<Follow[]>;
  getUserFollowing(userId: number): Promise<Follow[]>;

  // AI Content methods
  createAiContent(content: InsertAiContent): Promise<AiContent>;
  getAiContentById(id: number): Promise<AiContent | undefined>;
  getUserAiContents(userId: number, type?: string): Promise<AiContent[]>;

  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProjectById(id: number): Promise<Project | undefined>;
  getUserProjects(userId: number): Promise<Project[]>;
  updateProject(id: number, project: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Project Components methods
  createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent>;
  getProjectComponents(projectId: number): Promise<ProjectComponent[]>;
  updateProjectComponent(id: number, component: Partial<Omit<ProjectComponent, "id" | "projectId" | "createdAt">>): Promise<ProjectComponent>;
  deleteProjectComponent(id: number): Promise<void>;

  // Subscription methods
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;

  // Session store
  sessionStore: any; // Using any for session store type
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private postsMap: Map<number, Post>;
  private commentsMap: Map<number, Comment>;
  private likesMap: Map<number, Like>;
  private booksMap: Map<number, Book>;
  private followsMap: Map<number, Follow>;
  private aiContentsMap: Map<number, AiContent>;
  private projectsMap: Map<number, Project>;
  private projectComponentsMap: Map<number, ProjectComponent>;
  private subscriptionPlansMap: Map<number, SubscriptionPlan>;
  currentId: number;
  sessionStore: any; // Using any to bypass the typing error

  constructor() {
    this.usersMap = new Map();
    this.postsMap = new Map();
    this.commentsMap = new Map();
    this.likesMap = new Map();
    this.booksMap = new Map();
    this.followsMap = new Map();
    this.aiContentsMap = new Map();
    this.projectsMap = new Map();
    this.projectComponentsMap = new Map();
    this.subscriptionPlansMap = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const createdAt = new Date();
    const updatedAt = new Date();

    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      emailVerified: insertUser.emailVerified || false,
      verificationToken: insertUser.verificationToken || null,
      fullName: insertUser.fullName || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      avatar: insertUser.avatar || null,
      role: insertUser.role || "user",
      bio: insertUser.bio || null,
      onboardingCompleted: insertUser.onboardingCompleted || false,
      onboardingStep: insertUser.onboardingStep || 1,
      preferences: insertUser.preferences || {},
      stripeCustomerId: insertUser.stripeCustomerId || null,
      stripeSubscriptionId: insertUser.stripeSubscriptionId || null,
      subscriptionTier: insertUser.subscriptionTier || "free",
      resetPasswordToken: insertUser.resetPasswordToken || null,
      resetPasswordExpires: insertUser.resetPasswordExpires || null,
      lastLoginAt: insertUser.lastLoginAt || null,
      createdAt,
      updatedAt
    };

    this.usersMap.set(id, user);
    return user;
  }

  // Post methods
  async createPost(post: { userId: number; content: string; mediaUrl?: string }): Promise<Post> {
    const id = this.currentId++;
    const createdAt = new Date();
    const newPost: Post = {
      ...post,
      id,
      createdAt,
      mediaUrl: post.mediaUrl || null
    };
    this.postsMap.set(id, newPost);
    return newPost;
  }

  async getPostById(id: number): Promise<Post | undefined> {
    return this.postsMap.get(id);
  }

  async getAllPosts(limit = 10, offset = 0): Promise<Post[]> {
    return Array.from(this.postsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return Array.from(this.postsMap.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Comment methods
  async createComment(comment: { postId: number; userId: number; content: string }): Promise<Comment> {
    const id = this.currentId++;
    const createdAt = new Date();
    const newComment: Comment = { ...comment, id, createdAt };
    this.commentsMap.set(id, newComment);
    return newComment;
  }

  async getPostComments(postId: number): Promise<Comment[]> {
    return Array.from(this.commentsMap.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Like methods
  async createLike(like: { postId: number; userId: number }): Promise<Like> {
    const id = this.currentId++;
    const createdAt = new Date();
    const newLike: Like = { ...like, id, createdAt };
    this.likesMap.set(id, newLike);
    return newLike;
  }

  async deleteLike(postId: number, userId: number): Promise<void> {
    const likeToDelete = Array.from(this.likesMap.values()).find(like => like.postId === postId && like.userId === userId);
    if (likeToDelete) {
      this.likesMap.delete(likeToDelete.id);
    }
  }

  async getPostLikes(postId: number): Promise<Like[]> {
    return Array.from(this.likesMap.values()).filter(like => like.postId === postId);
  }

  // Book methods
  async getAllBooks(category?: string, limit = 10, offset = 0): Promise<Book[]> {
    let books = Array.from(this.booksMap.values());
    if (category) {
      books = books.filter(book => book.category === category);
    }
    return books.slice(offset, offset + limit);
  }

  async getBookById(id: number): Promise<Book | undefined> {
    return this.booksMap.get(id);
  }

  // Follow methods
  async followUser(followerId: number, followingId: number): Promise<Follow> {
    const follow: Follow = { followerId, followingId, createdAt: new Date() };
    this.followsMap.set(this.currentId++, follow);
    return follow;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    const followToDelete = Array.from(this.followsMap.values()).find(follow =>
      follow.followerId === followerId && follow.followingId === followingId);
    if (followToDelete) {
      this.followsMap.delete(followToDelete);
    }
  }

  async getUserFollowers(userId: number): Promise<Follow[]> {
    return Array.from(this.followsMap.values()).filter(follow => follow.followingId === userId);
  }

  async getUserFollowing(userId: number): Promise<Follow[]> {
    return Array.from(this.followsMap.values()).filter(follow => follow.followerId === userId);
  }

  // AI Content methods
  async createAiContent(content: InsertAiContent): Promise<AiContent> {
    const id = this.currentId++;
    const createdAt = new Date();
    const aiContent: AiContent = { id, ...content, createdAt };
    this.aiContentsMap.set(id, aiContent);
    return aiContent;
  }

  async getAiContentById(id: number): Promise<AiContent | undefined> {
    return this.aiContentsMap.get(id);
  }

  async getUserAiContents(userId: number, type?: string): Promise<AiContent[]> {
    return Array.from(this.aiContentsMap.values())
      .filter(aiContent => aiContent.userId === userId && (!type || aiContent.type === type));
  }

  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentId++;
    const createdAt = new Date();
    const newProject: Project = { id, ...project, createdAt };
    this.projectsMap.set(id, newProject);
    return newProject;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    return this.projectsMap.get(id);
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projectsMap.values())
      .filter(project => project.userId === userId);
  }

  async updateProject(id: number, project: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<Project> {
    const currentProject = this.projectsMap.get(id);
    if (currentProject) {
      const updatedProject = { ...currentProject, ...project, updatedAt: new Date() };
      this.projectsMap.set(id, updatedProject);
      return updatedProject;
    }
    return currentProject!;
  }

  async deleteProject(id: number): Promise<void> {
    this.projectsMap.delete(id);
  }

  // Project Components methods
  async createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent> {
    const id = this.currentId++;
    const newComponent: ProjectComponent = { id, ...component };
    this.projectComponentsMap.set(id, newComponent);
    return newComponent;
  }

  async getProjectComponents(projectId: number): Promise<ProjectComponent[]> {
    return Array.from(this.projectComponentsMap.values()).filter(component => component.projectId === projectId);
  }

  async updateProjectComponent(id: number, component: Partial<Omit<ProjectComponent, "id" | "projectId" | "createdAt">>): Promise<ProjectComponent> {
    const currentComponent = this.projectComponentsMap.get(id);
    if (currentComponent) {
      const updatedComponent = { ...currentComponent, ...component };
      this.projectComponentsMap.set(id, updatedComponent);
      return updatedComponent;
    }
    return currentComponent!;
  }

  async deleteProjectComponent(id: number): Promise<void> {
    this.projectComponentsMap.delete(id);
  }

  // Subscription methods
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlansMap.values());
  }

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlansMap.get(id);
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    return Array.from(this.subscriptionPlansMap.values()).find(plan => plan.name === name);
  }
}
