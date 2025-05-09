import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./auth";
import { z } from "zod";
import { insertCategorySchema, insertNewsletterSchema, insertUserNewsletterSchema } from "@shared/schema";
import { getAuthUrl, handleGoogleCallback, fetchGmailEmails } from "./googleAuth";
import { authMiddleware, googleAuthMiddleware } from "./middleware";
import { EmailService } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  setupAuthRoutes(app);

  // Google OAuth routes
  app.get("/api/auth/google/authorize", (_req, res) => {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  });

  app.get("/auth/callback", handleGoogleCallback);

  // Gmail API routes
  app.get("/api/gmail/messages", authMiddleware, googleAuthMiddleware, async (req: any, res) => {
    try {
      const query = req.query.q as string || "category:primary is:unread label:newsletter";
      const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 10;

      const emails = await fetchGmailEmails(req.googleToken.accessToken, query, maxResults);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching Gmail messages:", error);
      res.status(500).json({ message: "Failed to fetch Gmail messages" });
    }
  });

  // Newsletter Sender routes
  app.get("/api/newsletter-senders", authMiddleware, googleAuthMiddleware, async (req: any, res) => {
    try {
      const emailService = new EmailService(req.googleToken.accessToken);
      const authors = await emailService.getNewsletterAuthors(100);

      // Store these authors in the database
      const senders = [];
      for (const [name, email] of authors) {
        const domain = email.split('@')[1];
        // Check if sender already exists
        let sender = await storage.getNewsletterSenderByEmail(email);
        if (!sender) {
          sender = await storage.createNewsletterSender({
            name,
            email,
            domain,
            emailCount: 1 // This would be calculated from actual emails
          });
        } else {
          // Increment email count (mock implementation)
          sender = await storage.createNewsletterSender({ // Using create for simplicity in MemStorage
            ...sender,
            emailCount: sender.emailCount + 1
          });
        }
        senders.push(sender);
      }

      res.json(senders);
    } catch (error) {
      console.error("Error fetching newsletter senders:", error);
      res.status(500).json({ message: "Failed to fetch newsletter senders" });
    }
  });

  // Subscribe to newsletter senders
  app.post("/api/user/newsletter-senders", authMiddleware, async (req: any, res) => {
    try {
      const { senderEmails } = req.body;

      if (!Array.isArray(senderEmails)) {
        return res.status(400).json({ message: "Invalid data format" });
      }

      const subscriptions = [];
      for (const email of senderEmails) {
        // Check if subscription already exists
        let subscription = await storage.getUserNewsletterSender(req.user.id, email);
        if (!subscription) {
          subscription = await storage.saveUserNewsletterSender({
            userId: req.user.id,
            senderEmail: email,
            subscribed: true
          });
        } else {
          // Update existing subscription
          subscription = await storage.updateUserNewsletterSender(
            req.user.id,
            email,
            true // Ensure subscribed is true
          );
        }
        subscriptions.push(subscription);
      }

      res.status(201).json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to subscribe to newsletter senders" });
    }
  });

  // Update newsletter sender subscription
  app.put("/api/user/newsletter-senders/:email", authMiddleware, async (req: any, res) => {
    try {
      const { email } = req.params;
      const { subscribed } = req.body;

      if (typeof subscribed !== 'boolean') {
        return res.status(400).json({ message: "Invalid data format" });
      }

      const subscription = await storage.updateUserNewsletterSender(
        req.user.id,
        email,
        subscribed
      );

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Get user's newsletter sender subscriptions
  app.get("/api/user/newsletter-senders", authMiddleware, async (req: any, res) => {
    try {
      const subscriptions = await storage.getUserNewsletterSenders(req.user.id);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });


  // API Routes - prefix all routes with /api

  // Categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const parseResult = insertCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid category data", errors: parseResult.error.errors });
      }

      const newCategory = await storage.createCategory(parseResult.data);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Newsletters
  app.get("/api/newsletters/featured", async (req, res) => {
    try {
      const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
      const search = req.query.search as string | undefined;

      const newsletters = await storage.getFeaturedNewsletters({ categoryId, search });
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured newsletters" });
    }
  });

  app.get("/api/newsletters/recent", async (req, res) => {
    try {
      const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
      const search = req.query.search as string | undefined;

      const newsletters = await storage.getRecentNewsletters({ categoryId, search });
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent newsletters" });
    }
  });

  app.get("/api/newsletters/by-category", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const search = req.query.search as string | undefined;

      const newsletters = await storage.getNewslettersByCategory({ categoryId, search });
      res.json(newsletters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch newsletters by category" });
    }
  });

  app.get("/api/newsletters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid newsletter ID" });
      }

      const newsletter = await storage.getNewsletterById(id);
      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter not found" });
      }

      res.json(newsletter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch newsletter" });
    }
  });

  app.post("/api/newsletters", async (req, res) => {
    try {
      const parseResult = insertNewsletterSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid newsletter data", errors: parseResult.error.errors });
      }

      const newNewsletter = await storage.createNewsletter(parseResult.data);
      res.status(201).json(newNewsletter);
    } catch (error) {
      res.status(500).json({ message: "Failed to create newsletter" });
    }
  });

  // User's saved newsletters
  app.get("/api/user/newsletters", authMiddleware, async (req: any, res) => {
    try {
      const userNewsletters = await storage.getUserNewsletters(req.user.id);
      res.json(userNewsletters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user's newsletters" });
    }
  });

  app.post("/api/user/newsletters", authMiddleware, async (req: any, res) => {
    try {
      const parseResult = z.object({ newsletterId: z.number() }).safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: parseResult.error.errors });
      }

      const { newsletterId } = parseResult.data;
      
      // Check if newsletter exists
      const newsletter = await storage.getNewsletterById(newsletterId);
      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter not found" });
      }

      // Check if already saved
      const existing = await storage.getUserNewsletterByIds(req.user.id, newsletterId);
      if (existing) {
        return res.status(409).json({ message: "Newsletter already saved" });
      }

      // Save newsletter
      const userNewsletter = await storage.saveNewsletterForUser({
        userId: req.user.id,
        newsletterId,
      });

      res.status(201).json(userNewsletter);
    } catch (error) {
      res.status(500).json({ message: "Failed to save newsletter" });
    }
  });

  app.delete("/api/user/newsletters/:newsletterId", authMiddleware, async (req: any, res) => {
    try {
      const newsletterId = parseInt(req.params.newsletterId);
      if (isNaN(newsletterId)) {
        return res.status(400).json({ message: "Invalid newsletter ID" });
      }

      // Check if exists first
      const existing = await storage.getUserNewsletterByIds(req.user.id, newsletterId);
      if (!existing) {
        return res.status(404).json({ message: "Saved newsletter not found" });
      }

      await storage.removeNewsletterForUser(req.user.id, newsletterId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove newsletter" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
