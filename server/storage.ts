import { 
  type User, 
  type InsertUser, 
  type Category, 
  type InsertCategory, 
  type Newsletter, 
  type InsertNewsletter, 
  type UserNewsletter, 
  type InsertUserNewsletter,
  type UserToken,
  type InsertUserToken,
  type NewsletterSender,
  type InsertNewsletterSender,
  type UserNewsletterSender,
  type InsertUserNewsletterSender
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
  
  // User Token methods
  getUserTokens(userId: number): Promise<UserToken[]>;
  getUserTokenByProvider(userId: number, provider: string): Promise<UserToken | undefined>;
  saveUserToken(token: InsertUserToken): Promise<UserToken>;
  updateUserToken(id: number, tokenData: Partial<UserToken>): Promise<UserToken | undefined>;
  deleteUserToken(id: number): Promise<void>;
  
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
  getUserNewsletters(userId: number): Promise<{ newsletter: Newsletter; savedAt: Date }[]>;
  getUserNewsletterByIds(userId: number, newsletterId: number): Promise<UserNewsletter | undefined>;
  saveNewsletterForUser(data: InsertUserNewsletter): Promise<UserNewsletter>;
  removeNewsletterForUser(userId: number, newsletterId: number): Promise<void>;

  // Newsletter Sender methods
  getNewsletterSenders(): Promise<NewsletterSender[]>;
  createNewsletterSender(sender: InsertNewsletterSender): Promise<NewsletterSender>;
  getNewsletterSenderByEmail(email: string): Promise<NewsletterSender | undefined>;

  // User Newsletter Sender methods
  getUserNewsletterSenders(userId: number): Promise<UserNewsletterSender[]>;
  saveUserNewsletterSender(data: InsertUserNewsletterSender): Promise<UserNewsletterSender>;
  updateUserNewsletterSender(userId: number, senderEmail: string, subscribed: boolean): Promise<UserNewsletterSender | undefined>;
  getUserNewsletterSender(userId: number, senderEmail: string): Promise<UserNewsletterSender | undefined>;

  // First-time login detection
  isFirstTimeLogin(userId: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userTokens: Map<number, UserToken>;
  private categories: Map<number, Category>;
  private newsletters: Map<number, Newsletter>;
  private userNewsletters: Map<string, UserNewsletter>;
  private newsletterSenders: Map<number, NewsletterSender>;
  private userNewsletterSenders: Map<string, UserNewsletterSender>;

  private userId: number = 1;
  private userTokenId: number = 1;
  private categoryId: number = 1;
  private newsletterId: number = 1;
  private userNewsletterId: number = 1;
  private newsletterSenderId: number = 1;
  private userNewsletterSenderId: number = 1;

  constructor() {
    this.users = new Map();
    this.userTokens = new Map();
    this.categories = new Map();
    this.newsletters = new Map();
    this.userNewsletters = new Map();
    this.newsletterSenders = new Map();
    this.userNewsletterSenders = new Map();

    // Initialize with sample data
    this.initSampleData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }
  
  async getUserByProviderInfo(provider: string, providerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.provider === provider && user.providerId === providerId
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      name: insertUser.name || null,
      avatarUrl: insertUser.avatarUrl || null,
      provider: insertUser.provider || null,
      providerId: insertUser.providerId || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // User Token methods
  async getUserTokens(userId: number): Promise<UserToken[]> {
    return Array.from(this.userTokens.values()).filter(
      (token) => token.userId === userId
    );
  }
  
  async getUserTokenByProvider(userId: number, provider: string): Promise<UserToken | undefined> {
    return Array.from(this.userTokens.values()).find(
      (token) => token.userId === userId && token.provider === provider
    );
  }
  
  async saveUserToken(insertToken: InsertUserToken): Promise<UserToken> {
    const id = this.userTokenId++;
    const now = new Date();
    
    // Check if token already exists for this user and provider
    const existingToken = await this.getUserTokenByProvider(
      insertToken.userId,
      insertToken.provider
    );
    
    if (existingToken) {
      // Update existing token
      const updatedToken: UserToken = {
        ...existingToken,
        ...insertToken,
        updatedAt: now
      };
      this.userTokens.set(existingToken.id, updatedToken);
      return updatedToken;
    }
    
    // Create new token
    const userToken: UserToken = {
      ...insertToken,
      id,
      createdAt: now,
      updatedAt: now,
      refreshToken: insertToken.refreshToken || null,
      idToken: insertToken.idToken || null,
      expiresAt: insertToken.expiresAt || null
    };
    
    this.userTokens.set(id, userToken);
    return userToken;
  }
  
  async updateUserToken(id: number, tokenData: Partial<UserToken>): Promise<UserToken | undefined> {
    const token = this.userTokens.get(id);
    if (!token) return undefined;
    
    const now = new Date();
    const updatedToken = { 
      ...token, 
      ...tokenData,
      updatedAt: now
    };
    
    this.userTokens.set(id, updatedToken);
    return updatedToken;
  }
  
  async deleteUserToken(id: number): Promise<void> {
    this.userTokens.delete(id);
  }
  
  // Category methods
  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find((category) => category.name === name);
  }
  
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const newCategory: Category = { 
      ...category, 
      id,
      description: category.description || null
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  // Newsletter methods
  async getNewsletterById(id: number): Promise<Newsletter | undefined> {
    return this.newsletters.get(id);
  }
  
  async getFeaturedNewsletters(options: QueryOptions = {}): Promise<Newsletter[]> {
    let newsletters = Array.from(this.newsletters.values()).filter((n) => n.featured);
    
    // Filter by category if provided
    if (options.categoryId) {
      newsletters = newsletters.filter((n) => n.categoryId === options.categoryId);
    }
    
    // Filter by search term if provided
    if (options.search) {
      const search = options.search.toLowerCase();
      newsletters = newsletters.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.publisher.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search)
      );
    }
    
    // Sort by published date, newest first
    newsletters.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    // Apply limit if provided
    if (options.limit) {
      newsletters = newsletters.slice(0, options.limit);
    }
    
    return newsletters;
  }
  
  async getRecentNewsletters(options: QueryOptions = {}): Promise<Newsletter[]> {
    let newsletters = Array.from(this.newsletters.values());
    
    // Filter by category if provided
    if (options.categoryId) {
      newsletters = newsletters.filter((n) => n.categoryId === options.categoryId);
    }
    
    // Filter by search term if provided
    if (options.search) {
      const search = options.search.toLowerCase();
      newsletters = newsletters.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.publisher.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search)
      );
    }
    
    // Sort by published date, newest first
    newsletters.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    // Apply limit if provided
    if (options.limit) {
      newsletters = newsletters.slice(0, options.limit);
    }
    
    return newsletters;
  }
  
  async getNewslettersByCategory(options: QueryOptions = {}): Promise<Newsletter[]> {
    let newsletters = Array.from(this.newsletters.values());
    
    // Filter by category if provided
    if (options.categoryId) {
      newsletters = newsletters.filter((n) => n.categoryId === options.categoryId);
    }
    
    // Filter by search term if provided
    if (options.search) {
      const search = options.search.toLowerCase();
      newsletters = newsletters.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.publisher.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search)
      );
    }
    
    // Sort by published date, newest first
    newsletters.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    return newsletters;
  }
  
  async createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter> {
    const id = this.newsletterId++;
    const now = new Date();
    const newNewsletter: Newsletter = { 
      ...newsletter, 
      id, 
      publishedAt: newsletter.publishedAt || now,
      featured: newsletter.featured || false
    };
    this.newsletters.set(id, newNewsletter);
    return newNewsletter;
  }
  
  // User Newsletter methods
  async getUserNewsletters(userId: number): Promise<{ newsletter: Newsletter; savedAt: Date }[]> {
    const userNewsletters = Array.from(this.userNewsletters.values()).filter(
      (un) => un.userId === userId
    );
    
    return userNewsletters.map((un) => {
      const newsletter = this.newsletters.get(un.newsletterId);
      if (!newsletter) {
        throw new Error(`Newsletter not found: ${un.newsletterId}`);
      }
      return {
        newsletter,
        savedAt: un.savedAt
      };
    });
  }
  
  async getUserNewsletterByIds(userId: number, newsletterId: number): Promise<UserNewsletter | undefined> {
    return Array.from(this.userNewsletters.values()).find(
      (un) => un.userId === userId && un.newsletterId === newsletterId
    );
  }
  
  async saveNewsletterForUser(data: InsertUserNewsletter): Promise<UserNewsletter> {
    const id = this.userNewsletterId++;
    const now = new Date();
    const userNewsletter: UserNewsletter = {
      ...data,
      id,
      savedAt: now
    };
    
    const key = `${data.userId}-${data.newsletterId}`;
    this.userNewsletters.set(key, userNewsletter);
    return userNewsletter;
  }
  
  async removeNewsletterForUser(userId: number, newsletterId: number): Promise<void> {
    const key = `${userId}-${newsletterId}`;
    this.userNewsletters.delete(key);
  }

  // Newsletter Sender methods
  async getNewsletterSenders(): Promise<NewsletterSender[]> {
    return Array.from(this.newsletterSenders.values());
  }

  async createNewsletterSender(insertSender: InsertNewsletterSender): Promise<NewsletterSender> {
    const id = this.newsletterSenderId++;
    const now = new Date();
    const sender: NewsletterSender = {
      ...insertSender,
      id,
      createdAt: now,
      emailCount: insertSender.emailCount || 0, // Provide default value
    };
    this.newsletterSenders.set(id, sender);
    return sender;
  }

  async getNewsletterSenderByEmail(email: string): Promise<NewsletterSender | undefined> {
    return Array.from(this.newsletterSenders.values()).find(
      (sender) => sender.email === email
    );
  }

  // User Newsletter Sender methods
  async getUserNewsletterSenders(userId: number): Promise<UserNewsletterSender[]> {
    return Array.from(this.userNewsletterSenders.values()).filter(
      (subscription) => subscription.userId === userId
    );
  }

  async saveUserNewsletterSender(data: InsertUserNewsletterSender): Promise<UserNewsletterSender> {
    const id = this.userNewsletterSenderId++;
    const now = new Date();
    const userNewsletterSender: UserNewsletterSender = {
      ...data,
      id,
      subscribedAt: now,
      subscribed: data.subscribed || true, // Provide default value
    };

    const key = `${data.userId}-${data.senderEmail}`;
    this.userNewsletterSenders.set(key, userNewsletterSender);
    return userNewsletterSender;
  }

  async updateUserNewsletterSender(userId: number, senderEmail: string, subscribed: boolean): Promise<UserNewsletterSender | undefined> {
    const key = `${userId}-${senderEmail}`;
    const subscription = this.userNewsletterSenders.get(key);
    if (!subscription) return undefined;

    const updatedSubscription = { ...subscription, subscribed };
    this.userNewsletterSenders.set(key, updatedSubscription);
    return updatedSubscription;
  }

  async getUserNewsletterSender(userId: number, senderEmail: string): Promise<UserNewsletterSender | undefined> {
    const key = `${userId}-${senderEmail}`;
    return this.userNewsletterSenders.get(key);
  }

  // First-time login detection
  async isFirstTimeLogin(userId: number): Promise<boolean> {
    const userNewsletters = await this.getUserNewsletters(userId);
    const userNewsletterSenders = await this.getUserNewsletterSenders(userId);
    return userNewsletters.length === 0 && userNewsletterSenders.length === 0;
  }

  // Initialize sample data
  private initSampleData() {
    // Create categories
    const categoryData: InsertCategory[] = [
      { name: "Technology", description: "Latest tech news and innovations" },
      { name: "Business", description: "Business news, insights, and analysis" },
      { name: "Science", description: "Scientific breakthroughs and research" },
      { name: "Health", description: "Health, wellness, and medical news" },
      { name: "Politics", description: "Political news and analysis" }
    ];
    
    const categories: Category[] = categoryData.map(cat => {
      const category: Category = { 
        ...cat, 
        id: this.categoryId++,
        description: cat.description || null
      };
      this.categories.set(category.id, category);
      return category;
    });
    
    // Create sample newsletters
    const newsletterData: (Omit<InsertNewsletter, "categoryId"> & { categoryName: string; featured?: boolean })[] = [
      {
        title: "Tech Insider Daily",
        publisher: "TechCrunch",
        description: "Daily tech news and insights from Silicon Valley and beyond.",
        imageUrl: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/11/13/audio_cb31232ebb.mp3?filename=lofi-study-112191.mp3",
        duration: 900, // 15 min
        categoryName: "Technology",
        featured: true
      },
      {
        title: "Financial Digest",
        publisher: "Bloomberg",
        description: "Expert financial analysis and market insights delivered to your ears.",
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_628ce3666f.mp3?filename=ambient-piano-amp-strings-10711.mp3",
        duration: 1320, // 22 min
        categoryName: "Business",
        featured: true
      },
      {
        title: "Wellness Weekly",
        publisher: "Health Insider",
        description: "The latest health research and wellness tips for a balanced lifestyle.",
        imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49bc27.mp3?filename=forest-lullaby-110624.mp3",
        duration: 1080, // 18 min
        categoryName: "Health",
        featured: true
      },
      {
        title: "AI Breakthrough Weekly",
        publisher: "MIT Technology",
        description: "Latest research and developments in artificial intelligence and machine learning.",
        imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_00cb9ae7bc.mp3?filename=electronic-future-beats-117997.mp3",
        duration: 720, // 12 min
        categoryName: "Technology"
      },
      {
        title: "Climate Change Update",
        publisher: "Nature Publishing",
        description: "Research and news about climate change, sustainability, and environmental protection.",
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_d1d14b027d.mp3?filename=inspiring-dream-140960.mp3",
        duration: 1200, // 20 min
        categoryName: "Science"
      },
      {
        title: "Startup Funding Roundup",
        publisher: "Venture Beat",
        description: "Weekly summary of startup fundraising, acquisitions, and venture capital trends.",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_f1b7e16d32.mp3?filename=relaxing-145038.mp3",
        duration: 1020, // 17 min
        categoryName: "Business"
      },
      {
        title: "Political Analysis",
        publisher: "The Washington Post",
        description: "In-depth analysis of politics, policy, and international relations.",
        imageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_d18fb3ef5a.mp3?filename=life-of-a-wanderer-15500.mp3",
        duration: 1500, // 25 min
        categoryName: "Politics"
      },
      {
        title: "Medical Breakthroughs",
        publisher: "JAMA Network",
        description: "Latest medical research, treatments, and healthcare innovations.",
        imageUrl: "https://images.unsplash.com/photo-1576671334150-d2d56ebf2b53?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6bf3069.mp3?filename=cinematic-chill-hip-hop-131453.mp3",
        duration: 840, // 14 min
        categoryName: "Health"
      }
    ];
    
    const now = new Date();
    let daysAgo = 0;
    
    newsletterData.forEach(data => {
      const categoryId = categories.find(c => c.name === data.categoryName)?.id;
      if (!categoryId) return;
      
      const publishDate = new Date(now);
      publishDate.setDate(publishDate.getDate() - daysAgo++);
      
      const newsletter: Newsletter = {
        id: this.newsletterId++,
        title: data.title,
        publisher: data.publisher,
        description: data.description,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        duration: data.duration,
        categoryId,
        publishedAt: publishDate,
        featured: data.featured || false
      };
      
      this.newsletters.set(newsletter.id, newsletter);
    });
  }
}

export const storage = new MemStorage();
