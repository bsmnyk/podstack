import { pgTable, text, serial, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  provider: text("provider"), // 'local', 'google', 'facebook', 'twitter'
  providerId: text("provider_id"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Newsletters schema
export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull(), // in seconds
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  featured: boolean("featured").default(false),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
});

// User OAuth tokens
export const userTokens = pgTable("user_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  provider: text("provider").notNull(), // 'google', 'facebook', 'twitter'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserTokenSchema = createInsertSchema(userTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User favorites/saved newsletters
export const userNewsletters = pgTable("user_newsletters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  newsletterId: integer("newsletter_id")
    .references(() => newsletters.id)
    .notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

export const insertUserNewsletterSchema = createInsertSchema(userNewsletters).omit({
  id: true,
  savedAt: true,
});

// Newsletter Senders schema
export const newsletterSenders = pgTable("newsletter_senders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  domain: text("domain").notNull(),
  emailCount: integer("email_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNewsletterSenderSchema = createInsertSchema(newsletterSenders).omit({
  id: true,
  createdAt: true,
});

// User Newsletter Senders (Subscriptions) schema
export const userNewsletterSenders = pgTable("user_newsletter_senders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  senderEmail: text("sender_email").notNull(),
  subscribed: boolean("subscribed").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

export const insertUserNewsletterSenderSchema = createInsertSchema(userNewsletterSenders).omit({
  id: true,
  subscribedAt: true,
});

// Subscribed Newsletters schema
export const subscribedNewsletters = pgTable("subscribed_newsletters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  from: text("from").notNull(),
  date: text("date").notNull(),
  plainText: text("plain_text"),
  markdown: text("markdown"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const insertSubscribedNewsletterSchema = createInsertSchema(subscribedNewsletters).omit({
  id: true,
  receivedAt: true,
});


// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;

export type UserToken = typeof userTokens.$inferSelect;
export type InsertUserToken = z.infer<typeof insertUserTokenSchema>;

export type UserNewsletter = typeof userNewsletters.$inferSelect;
export type InsertUserNewsletter = z.infer<typeof insertUserNewsletterSchema>;

export type NewsletterSender = typeof newsletterSenders.$inferSelect;
export type InsertNewsletterSender = z.infer<typeof insertNewsletterSenderSchema>;

export type UserNewsletterSender = typeof userNewsletterSenders.$inferSelect;
export type InsertUserNewsletterSender = z.infer<typeof insertUserNewsletterSenderSchema>;

export type SubscribedNewsletter = typeof subscribedNewsletters.$inferSelect;
export type InsertSubscribedNewsletter = z.infer<typeof insertSubscribedNewsletterSchema>;

// Additional type for newsletter content from EmailService
export interface NewsletterContent {
  subject: string;
  from: string;
  date: string;
  plain_text?: string;
  markdown?: string;
}
