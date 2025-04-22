import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes } from "./auth";
import { z } from "zod";
import { insertCategorySchema, insertNewsletterSchema, insertUserNewsletterSchema } from "@shared/schema";
import { getAuthUrl, handleGoogleCallback, fetchGmailEmails } from "./googleAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  setupAuthRoutes(app);

  // Google OAuth routes
  app.get("/api/auth/google/authorize", (_req, res) => {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  });

  app.get("/api/auth/google/callback", handleGoogleCallback);

  // app.post("/api/auth/google/exchange", handleTokenExchange);

  // Gmail API routes
  app.get("/api/gmail/messages", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accessToken = req.headers.authorization?.split(" ")[1];
      if (!accessToken) {
        return res.status(401).json({ message: "Access token required" });
      }

      const query = req.query.q as string || "category:primary is:unread label:newsletter";
      const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 10;

      const emails = await fetchGmailEmails(accessToken, query, maxResults);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching Gmail messages:", error);
      res.status(500).json({ message: "Failed to fetch Gmail messages" });
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
  app.get("/api/user/newsletters", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userNewsletters = await storage.getUserNewsletters(req.session.userId);
      res.json(userNewsletters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user's newsletters" });
    }
  });

  app.post("/api/user/newsletters", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

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
      const existing = await storage.getUserNewsletterByIds(req.session.userId, newsletterId);
      if (existing) {
        return res.status(409).json({ message: "Newsletter already saved" });
      }

      // Save newsletter
      const userNewsletter = await storage.saveNewsletterForUser({
        userId: req.session.userId,
        newsletterId,
      });

      res.status(201).json(userNewsletter);
    } catch (error) {
      res.status(500).json({ message: "Failed to save newsletter" });
    }
  });

  app.delete("/api/user/newsletters/:newsletterId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const newsletterId = parseInt(req.params.newsletterId);
      if (isNaN(newsletterId)) {
        return res.status(400).json({ message: "Invalid newsletter ID" });
      }

      // Check if exists first
      const existing = await storage.getUserNewsletterByIds(req.session.userId, newsletterId);
      if (!existing) {
        return res.status(404).json({ message: "Saved newsletter not found" });
      }

      await storage.removeNewsletterForUser(req.session.userId, newsletterId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove newsletter" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
