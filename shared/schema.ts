import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Photo schema
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  size: integer("size").notNull(),
  projectId: text("project_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// Audio schema
export const audios = pgTable("audios", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  text: text("text").notNull(),
  voice: text("voice").notNull(),
  duration: integer("duration"),
  projectId: text("project_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertAudioSchema = createInsertSchema(audios).omit({
  id: true,
});

export type InsertAudio = z.infer<typeof insertAudioSchema>;
export type Audio = typeof audios.$inferSelect;

// Video schema
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  duration: integer("duration"),
  photoIds: text("photo_ids").array().notNull(),
  audioId: integer("audio_id").notNull(),
  projectId: text("project_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects);

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Request schemas
export const generateAudioSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().min(1),
  projectId: z.string().min(1),
});

export const generateVideoSchema = z.object({
  photoIds: z.array(z.string().min(1)),
  audioId: z.number(),
  projectId: z.string().min(1),
});

// Response types
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
}

export interface PhotoValidationResponse {
  isValid: boolean;
  error?: string;
}

// User Preferences schema
export const savedVoices = pgTable("saved_voices", {
  id: serial("id").primaryKey(),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  displayName: text("display_name"),
  position: integer("position").notNull().default(0), // 0, 1, or 2 (para las 3 posiciones)
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertSavedVoiceSchema = createInsertSchema(savedVoices).omit({
  id: true,
});

export type InsertSavedVoice = z.infer<typeof insertSavedVoiceSchema>;
export type SavedVoice = typeof savedVoices.$inferSelect;

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  selectedLogoId: integer("selected_logo_id").default(1), // 1, 2, o 3 para los 3 logos disponibles
  logoPosition: text("logo_position").default("top-right"), // top-right, top-left, bottom-right, bottom-left
  showTitle: boolean("show_title").default(true),
  titleText: text("title_text").default(""), // Texto a mostrar como overlay
  titleFontSize: integer("title_font_size").default(32),
  titleColor: text("title_color").default("#ffffff"),
  titlePosition: text("title_position").default("top-center"), // top-center, bottom-center
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
});

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;

// Mantenemos la tabla anterior para compatibilidad pero no la usaremos más
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  favoriteVoiceId: text("favorite_voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
