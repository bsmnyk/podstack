import { 
  type User, 
  type InsertUser, 
  type Category, 
  type InsertCategory, 
  type Newsletter, 
  type InsertNewsletter, 
  type UserNewsletter, 
  type InsertUserNewsletter 
} from "@shared/schema";

interface QueryOptions {
  categoryId?: number;
  search?: string;
  limit?: number;
}

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderInfo(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Category methods
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Newsletter methods
  getNewsletterById(id: number): Promise<Newsletter | undefined>;
  getFeaturedNewsletters(options?: QueryOptions): Promise<Newsletter[]>;
  getRecentNewsletters(options?: QueryOptions): Promise<Newsletter[]>;
  getNewslettersByCategory(options?: QueryOptions): Promise<Newsletter[]>;
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
  
  // User Newsletter methods
  getUserNewsletters(userId: number): Promise<{ newsletter: Newsletter; savedAt: string }[]>;
  getUserNewsletterByIds(userId: number, newsletterId: number): Promise<UserNewsletter | undefined>;
  saveNewsletterForUser(data: InsertUserNewsletter): Promise<UserNewsletter>;
  removeNewsletterForUser(userId: number, newsletterId: number): Promise<void>;
}

// Database storage implementation
import { db } from "./db";
import { eq, desc, and, asc, like, ilike } from "drizzle-orm";
import { 
  users, 
  categories, 
  newsletters, 
  userNewsletters 
} from "@shared/schema";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByProviderInfo(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.provider, provider),
        eq(users.providerId, providerId)
      )
    );
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  // Category methods
  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }
  
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.name));
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }
  
  // Newsletter methods
  async getNewsletterById(id: number): Promise<Newsletter | undefined> {
    const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));
    return newsletter;
  }
  
  async getFeaturedNewsletters(options: QueryOptions = {}): Promise<Newsletter[]> {
    let query = db.select()
      .from(newsletters)
      .where(eq(newsletters.featured, true))
      .orderBy(desc(newsletters.publishedAt));
    
    if (options.categoryId) {
      query = query.where(eq(newsletters.categoryId, options.categoryId));
    }
    
    if (options.search) {
      query = query.where(
        or(
          ilike(newsletters.title, `%${options.search}%`),
          ilike(newsletters.publisher, `%${options.search}%`),
          ilike(newsletters.description, `%${options.search}%`)
        )
      );
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return query;
  }
  
  async getRecentNewsletters(options: QueryOptions = {}): Promise<Newsletter[]> {
    let query = db.select()
      .from(newsletters)
      .orderBy(desc(newsletters.publishedAt));
    
    if (options.categoryId) {
      query = query.where(eq(newsletters.categoryId, options.categoryId));
    }
    
    if (options.search) {
      query = query.where(
        or(
          ilike(newsletters.title, `%${options.search}%`),
          ilike(newsletters.publisher, `%${options.search}%`),
          ilike(newsletters.description, `%${options.search}%`)
        )
      );
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return query;
  }
  
  async getNewslettersByCategory(options: QueryOptions = {}): Promise<Newsletter[]> {
    let query = db.select()
      .from(newsletters)
      .orderBy(desc(newsletters.publishedAt));
    
    if (options.categoryId) {
      query = query.where(eq(newsletters.categoryId, options.categoryId));
    }
    
    if (options.search) {
      query = query.where(
        or(
          ilike(newsletters.title, `%${options.search}%`),
          ilike(newsletters.publisher, `%${options.search}%`),
          ilike(newsletters.description, `%${options.search}%`)
        )
      );
    }
    
    return query;
  }
  
  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    const [newNewsletter] = await db.insert(newsletters).values({
      ...newsletter,
      publishedAt: newsletter.publishedAt || new Date().toISOString()
    }).returning();
    return newNewsletter;
  }
  
  // User Newsletter methods
  async getUserNewsletters(userId: number): Promise<{ newsletter: Newsletter; savedAt: string }[]> {
    const results = await db.select({
      newsletter: newsletters,
      savedAt: userNewsletters.savedAt
    })
    .from(userNewsletters)
    .innerJoin(newsletters, eq(userNewsletters.newsletterId, newsletters.id))
    .where(eq(userNewsletters.userId, userId))
    .orderBy(desc(userNewsletters.savedAt));
    
    return results;
  }
  
  async getUserNewsletterByIds(userId: number, newsletterId: number): Promise<UserNewsletter | undefined> {
    const [userNewsletter] = await db.select()
      .from(userNewsletters)
      .where(
        and(
          eq(userNewsletters.userId, userId),
          eq(userNewsletters.newsletterId, newsletterId)
        )
      );
    return userNewsletter;
  }
  
  async saveNewsletterForUser(data: InsertUserNewsletter): Promise<UserNewsletter> {
    const now = new Date().toISOString();
    const [userNewsletter] = await db.insert(userNewsletters)
      .values({
        ...data,
        savedAt: now
      })
      .returning();
    return userNewsletter;
  }
  
  async removeNewsletterForUser(userId: number, newsletterId: number): Promise<void> {
    await db.delete(userNewsletters)
      .where(
        and(
          eq(userNewsletters.userId, userId),
          eq(userNewsletters.newsletterId, newsletterId)
        )
      );
  }
}

// Export a new instance of DatabaseStorage
export const storage = new DatabaseStorage();
