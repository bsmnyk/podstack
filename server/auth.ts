import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Setup session storage for production
let sessionStore;
if (process.env.NODE_ENV === "production") {
  const MemoryStore = require("memorystore")(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
} else {
  // Development session store
  sessionStore = new session.MemoryStore();
}

export function setupAuthRoutes(app: Express) {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "podstack-app-secret",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Local strategy for username/password login
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check if user exists by username or email
        const user = await storage.getUserByUsername(username) || 
                     await storage.getUserByEmail(username);
                     
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }

        // In a real app, you'd use a proper password hashing library like bcrypt
        // For this demo, we're using plain text
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid user data", errors: parseResult.error.errors });
      }

      const { username, email, password } = parseResult.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username) || 
                          await storage.getUserByEmail(email);
                          
      if (existingUser) {
        return res.status(409).json({ message: "Username or email already exists" });
      }

      // Create new user
      const newUser = await storage.createUser({ username, email, password });

      // Log user in (create session)
      req.session.userId = newUser.id;

      // Return user data (exclude password)
      const { password: _, ...userData } = newUser;
      res.status(201).json(userData);
    } catch (error) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // User login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message || "Login failed" });

      // Log user in (create session)
      req.session.userId = user.id;

      // Return user data (exclude password)
      const { password, ...userData } = user;
      res.json(userData);
    })(req, res, next);
  });

  // User logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    storage.getUser(req.session.userId)
      .then(user => {
        if (!user) {
          req.session.destroy(() => {});
          return res.status(401).json({ message: "User not found" });
        }

        // Return user data (exclude password)
        const { password, ...userData } = user;
        res.json(userData);
      })
      .catch(error => {
        res.status(500).json({ message: "Failed to get user data" });
      });
  });

  // Mock OAuth routes for demonstration purposes
  // In a real app, these would use actual OAuth providers

  // Google OAuth
  app.get("/api/auth/google/authorize", (req, res) => {
    // In a real app, redirect to Google's OAuth URL
    // For demo, simulate the OAuth flow
    const state = crypto.randomBytes(16).toString("hex");
    res.redirect(`/api/auth/oauth-callback?provider=google&state=${state}`);
  });

  // Facebook OAuth
  app.get("/api/auth/facebook/authorize", (req, res) => {
    // In a real app, redirect to Facebook's OAuth URL
    // For demo, simulate the OAuth flow
    const state = crypto.randomBytes(16).toString("hex");
    res.redirect(`/api/auth/oauth-callback?provider=facebook&state=${state}`);
  });

  // Twitter OAuth
  app.get("/api/auth/twitter/authorize", (req, res) => {
    // In a real app, redirect to Twitter's OAuth URL
    // For demo, simulate the OAuth flow
    const state = crypto.randomBytes(16).toString("hex");
    res.redirect(`/api/auth/oauth-callback?provider=twitter&state=${state}`);
  });

  // OAuth callback page that sends a message to the opener window
  app.get("/api/auth/oauth-callback", (req, res) => {
    const provider = req.query.provider as string;
    
    // In a real app, this would validate the code and exchange it for tokens
    // For demo, create a mock user based on the provider
    
    const callbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Callback</title>
      </head>
      <body>
        <h1>Authenticating with ${provider}...</h1>
        <script>
          // Send auth result to parent window and close this one
          window.opener.postMessage({
            type: "auth_callback",
            provider: "${provider}",
            success: true
          }, window.location.origin);
          
          // Create a simulated user in the parent window
          window.opener.postMessage({
            type: "demo_user",
            user: {
              id: ${Math.floor(Math.random() * 1000)},
              username: "user_${provider}_${Date.now()}",
              email: "user@${provider}.com",
              name: "Demo User",
              avatarUrl: "https://ui-avatars.com/api/?name=Demo+User&background=random"
            }
          }, window.location.origin);
          
          // Close this window
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>
    `;
    
    res.send(callbackHtml);
  });

  // OAuth callback API for token exchange
  app.post("/api/auth/:provider/callback", async (req, res) => {
    try {
      // In a real app, this would validate the code and exchange it for tokens
      // For demo, create a mock user based on the provider
      const provider = req.params.provider;
      const code = req.body.code;
      
      if (!code) {
        return res.status(400).json({ message: "Missing authorization code" });
      }
      
      // Simulate creating/retrieving a user
      const email = `user@${provider}.com`;
      const providerId = `${provider}_${Date.now()}`;
      
      // Check if user exists
      let user = await storage.getUserByProviderInfo(provider, providerId);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          username: `user_${provider}_${Date.now()}`,
          email,
          password: crypto.randomBytes(16).toString("hex"), // Random password for OAuth users
          provider,
          providerId,
          name: "Demo User",
          avatarUrl: "https://ui-avatars.com/api/?name=Demo+User&background=random"
        });
      }
      
      // Log user in (create session)
      req.session.userId = user.id;
      
      // Return mock tokens (in a real app, these would be actual OAuth tokens)
      res.json({
        access_token: `mock_access_token_${Date.now()}`,
        id_token: `mock_id_token_${Date.now()}`,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        expires_in: 3600,
        token_type: "Bearer"
      });
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  });
}
