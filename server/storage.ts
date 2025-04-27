import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  photos, type Photo, type InsertPhoto,
  audios, type Audio, type InsertAudio,
  videos, type Video, type InsertVideo,
  savedVoices, type SavedVoice, type InsertSavedVoice,
  logos, type Logo, type InsertLogo,
  savedLogos, type SavedLogo, type InsertSavedLogo,
  appSettings, type AppSettings, type InsertAppSettings,
  userPreferences, type UserPreferences, type InsertUserPreferences,
  backgroundMusic, type BackgroundMusic, type InsertBackgroundMusic,
  uploadedVideos, type UploadedVideo, type InsertUploadedVideo
} from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  getAllProjects(): Promise<Project[]>;
  getTemplates(): Promise<Project[]>;
  getLatestTemplate(): Promise<Project | undefined>;
  
  // Photo methods
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhoto(id: number): Promise<Photo | undefined>;
  getPhotosByProjectId(projectId: string): Promise<Photo[]>;
  deletePhoto(id: number): Promise<boolean>;
  
  // Audio methods
  createAudio(audio: InsertAudio): Promise<Audio>;
  getAudio(id: number): Promise<Audio | undefined>;
  getAudioByProjectId(projectId: string): Promise<Audio | undefined>;
  
  // Video methods
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByProjectId(projectId: string): Promise<Video | undefined>;
  getVideosByProjectId(projectId: string): Promise<Video[]>;
  
  // Legacy User Preferences methods
  getFavoriteVoice(): Promise<UserPreferences | undefined>;
  saveFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Saved Voices methods
  getSavedVoices(): Promise<SavedVoice[]>;
  getSavedVoice(id: number): Promise<SavedVoice | undefined>;
  getSavedVoiceByPosition(position: number): Promise<SavedVoice | undefined>;
  getDefaultSavedVoice(): Promise<SavedVoice | undefined>;
  saveSavedVoice(voice: InsertSavedVoice): Promise<SavedVoice>;
  updateSavedVoice(id: number, voice: Partial<InsertSavedVoice>): Promise<SavedVoice>;
  deleteSavedVoice(id: number): Promise<boolean>;
  
  // Logo methods
  getLogos(): Promise<Logo[]>;
  getLogo(id: number): Promise<Logo | undefined>;
  createLogo(logo: InsertLogo): Promise<Logo>;
  deleteLogo(id: number): Promise<boolean>;
  
  // Saved Logos methods
  getSavedLogos(): Promise<SavedLogo[]>;
  getSavedLogo(id: number): Promise<SavedLogo | undefined>;
  getSavedLogoByPosition(position: number): Promise<SavedLogo | undefined>;
  getDefaultSavedLogo(): Promise<SavedLogo | undefined>;
  saveSavedLogo(logo: InsertSavedLogo): Promise<SavedLogo>;
  updateSavedLogo(id: number, logo: Partial<InsertSavedLogo>): Promise<SavedLogo>;
  deleteSavedLogo(id: number): Promise<boolean>;
  
  // App Settings methods
  getAppSettings(): Promise<AppSettings | undefined>;
  saveAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;
  
  // Background Music methods
  getBackgroundMusic(): Promise<BackgroundMusic[]>;
  getBackgroundMusicById(id: number): Promise<BackgroundMusic | undefined>;
  createBackgroundMusic(music: InsertBackgroundMusic): Promise<BackgroundMusic>;
  deleteBackgroundMusic(id: number): Promise<boolean>;
  
  // Uploaded Video methods
  createUploadedVideo(video: InsertUploadedVideo): Promise<UploadedVideo>;
  getUploadedVideo(id: number): Promise<UploadedVideo | undefined>;
  getUploadedVideosByProjectId(projectId: string): Promise<UploadedVideo[]>;
  deleteUploadedVideo(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    // Asignar un ID si no se proporciona
    if (!project.id) {
      project.id = nanoid();
    }
    
    // Asegurar que createdAt existe
    if (!project.createdAt) {
      project.createdAt = new Date().toISOString();
    }
    
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }
  
  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }
  
  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    // Actualizar la fecha de modificación
    project.updatedAt = new Date().toISOString();
    
    const result = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    
    return result[0];
  }
  
  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.isTemplate, false))
      .orderBy(desc(projects.createdAt));
  }
  
  async getTemplates(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.isTemplate, true))
      .orderBy(desc(projects.createdAt));
  }
  
  async getLatestTemplate(): Promise<Project | undefined> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.isTemplate, true))
      .orderBy(desc(projects.createdAt))
      .limit(1);
    
    return result[0];
  }
  
  // Photo methods
  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const result = await db.insert(photos).values(photo).returning();
    return result[0];
  }
  
  async getPhoto(id: number): Promise<Photo | undefined> {
    const result = await db.select().from(photos).where(eq(photos.id, id));
    return result[0];
  }
  
  async getPhotosByProjectId(projectId: string): Promise<Photo[]> {
    return await db
      .select()
      .from(photos)
      .where(eq(photos.projectId, projectId));
  }
  
  async deletePhoto(id: number): Promise<boolean> {
    const result = await db
      .delete(photos)
      .where(eq(photos.id, id))
      .returning({ id: photos.id });
    
    return result.length > 0;
  }
  
  // Audio methods
  async createAudio(audio: InsertAudio): Promise<Audio> {
    const result = await db.insert(audios).values(audio).returning();
    return result[0];
  }
  
  async getAudio(id: number): Promise<Audio | undefined> {
    const result = await db.select().from(audios).where(eq(audios.id, id));
    return result[0];
  }
  
  async getAudioByProjectId(projectId: string): Promise<Audio | undefined> {
    const result = await db
      .select()
      .from(audios)
      .where(eq(audios.projectId, projectId))
      .orderBy(desc(audios.createdAt));
    
    return result[0];
  }
  
  // Video methods
  async createVideo(video: InsertVideo): Promise<Video> {
    const result = await db.insert(videos).values(video).returning();
    return result[0];
  }
  
  async getVideo(id: number): Promise<Video | undefined> {
    const result = await db.select().from(videos).where(eq(videos.id, id));
    return result[0];
  }
  
  async getVideoByProjectId(projectId: string): Promise<Video | undefined> {
    const result = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(desc(videos.createdAt));
    
    return result[0];
  }
  
  async getVideosByProjectId(projectId: string): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(desc(videos.createdAt));
  }
  
  // Legacy User Preferences methods
  async getFavoriteVoice(): Promise<UserPreferences | undefined> {
    const result = await db.select().from(userPreferences);
    return result[0];
  }
  
  async saveFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const result = await db.insert(userPreferences).values(preferences).returning();
    return result[0];
  }
  
  async updateFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    // Obtener el ID existente
    const existingPref = await this.getFavoriteVoice();
    if (!existingPref) {
      throw new Error("No favorite voice found to update");
    }
    
    const result = await db
      .update(userPreferences)
      .set(preferences)
      .where(eq(userPreferences.id, existingPref.id))
      .returning();
    
    return result[0];
  }
  
  // Saved Voices methods
  async getSavedVoices(): Promise<SavedVoice[]> {
    return await db.select().from(savedVoices).orderBy(savedVoices.position);
  }
  
  async getSavedVoice(id: number): Promise<SavedVoice | undefined> {
    const result = await db.select().from(savedVoices).where(eq(savedVoices.id, id));
    return result[0];
  }
  
  async getSavedVoiceByPosition(position: number): Promise<SavedVoice | undefined> {
    const result = await db.select().from(savedVoices).where(eq(savedVoices.position, position));
    return result[0];
  }
  
  async getDefaultSavedVoice(): Promise<SavedVoice | undefined> {
    const result = await db.select().from(savedVoices).where(eq(savedVoices.isDefault, true));
    return result[0];
  }
  
  async saveSavedVoice(voice: InsertSavedVoice): Promise<SavedVoice> {
    const result = await db.insert(savedVoices).values(voice).returning();
    return result[0];
  }
  
  async updateSavedVoice(id: number, voice: Partial<InsertSavedVoice>): Promise<SavedVoice> {
    const result = await db
      .update(savedVoices)
      .set(voice)
      .where(eq(savedVoices.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteSavedVoice(id: number): Promise<boolean> {
    const result = await db
      .delete(savedVoices)
      .where(eq(savedVoices.id, id))
      .returning({ id: savedVoices.id });
    
    return result.length > 0;
  }
  
  // Logo methods
  async getLogos(): Promise<Logo[]> {
    return await db.select().from(logos);
  }
  
  async getLogo(id: number): Promise<Logo | undefined> {
    const result = await db.select().from(logos).where(eq(logos.id, id));
    return result[0];
  }
  
  async createLogo(logo: InsertLogo): Promise<Logo> {
    const result = await db.insert(logos).values(logo).returning();
    return result[0];
  }
  
  async deleteLogo(id: number): Promise<boolean> {
    const result = await db
      .delete(logos)
      .where(eq(logos.id, id))
      .returning({ id: logos.id });
    
    return result.length > 0;
  }
  
  // Saved Logos methods
  async getSavedLogos(): Promise<SavedLogo[]> {
    return await db.select().from(savedLogos).orderBy(savedLogos.position);
  }
  
  async getSavedLogo(id: number): Promise<SavedLogo | undefined> {
    const result = await db.select().from(savedLogos).where(eq(savedLogos.id, id));
    return result[0];
  }
  
  async getSavedLogoByPosition(position: number): Promise<SavedLogo | undefined> {
    const result = await db.select().from(savedLogos).where(eq(savedLogos.position, position));
    return result[0];
  }
  
  async getDefaultSavedLogo(): Promise<SavedLogo | undefined> {
    const result = await db.select().from(savedLogos).where(eq(savedLogos.isDefault, true));
    return result[0];
  }
  
  async saveSavedLogo(logo: InsertSavedLogo): Promise<SavedLogo> {
    const result = await db.insert(savedLogos).values(logo).returning();
    return result[0];
  }
  
  async updateSavedLogo(id: number, logo: Partial<InsertSavedLogo>): Promise<SavedLogo> {
    const result = await db
      .update(savedLogos)
      .set(logo)
      .where(eq(savedLogos.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteSavedLogo(id: number): Promise<boolean> {
    const result = await db
      .delete(savedLogos)
      .where(eq(savedLogos.id, id))
      .returning({ id: savedLogos.id });
    
    return result.length > 0;
  }
  
  // App Settings methods
  async getAppSettings(): Promise<AppSettings | undefined> {
    const result = await db.select().from(appSettings);
    return result[0];
  }
  
  async saveAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    const result = await db.insert(appSettings).values(settings).returning();
    return result[0];
  }
  
  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    // Obtener el ID existente
    const existingSettings = await this.getAppSettings();
    if (!existingSettings) {
      throw new Error("No app settings found to update");
    }
    
    const result = await db
      .update(appSettings)
      .set(settings)
      .where(eq(appSettings.id, existingSettings.id))
      .returning();
    
    return result[0];
  }
  
  // Background Music methods
  async getBackgroundMusic(): Promise<BackgroundMusic[]> {
    return await db.select().from(backgroundMusic);
  }
  
  async getBackgroundMusicById(id: number): Promise<BackgroundMusic | undefined> {
    const result = await db.select().from(backgroundMusic).where(eq(backgroundMusic.id, id));
    return result[0];
  }
  
  async createBackgroundMusic(music: InsertBackgroundMusic): Promise<BackgroundMusic> {
    const result = await db.insert(backgroundMusic).values(music).returning();
    return result[0];
  }
  
  async deleteBackgroundMusic(id: number): Promise<boolean> {
    const result = await db
      .delete(backgroundMusic)
      .where(eq(backgroundMusic.id, id))
      .returning({ id: backgroundMusic.id });
    
    return result.length > 0;
  }
  
  // Uploaded Video methods
  async createUploadedVideo(video: InsertUploadedVideo): Promise<UploadedVideo> {
    const result = await db.insert(uploadedVideos).values(video).returning();
    return result[0];
  }
  
  async getUploadedVideo(id: number): Promise<UploadedVideo | undefined> {
    const result = await db.select().from(uploadedVideos).where(eq(uploadedVideos.id, id));
    return result[0];
  }
  
  async getUploadedVideosByProjectId(projectId: string): Promise<UploadedVideo[]> {
    return await db
      .select()
      .from(uploadedVideos)
      .where(eq(uploadedVideos.projectId, projectId));
  }
  
  async deleteUploadedVideo(id: number): Promise<boolean> {
    const result = await db
      .delete(uploadedVideos)
      .where(eq(uploadedVideos.id, id))
      .returning({ id: uploadedVideos.id });
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();