import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;

export type UserNewsletter = typeof userNewsletters.$inferSelect;
export type InsertUserNewsletter = z.infer<typeof insertUserNewsletterSchema>;
