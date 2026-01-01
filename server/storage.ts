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
  deleteAudio(id: number): Promise<boolean>;

  // Video methods
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByProjectId(projectId: string): Promise<Video | undefined>;
  getVideosByProjectId(projectId: string): Promise<Video[]>;
  getAllVideos(): Promise<Video[]>;

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

  async deleteAudio(id: number): Promise<boolean> {
    try {
      const result = await db.delete(audios).where(eq(audios.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting audio:', error);
      return false;
    }
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

  async getAllVideos(): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
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

// Implementación temporal de almacenamiento en memoria
class MemStorage implements IStorage {
  private projects = new Map<string, Project>();
  private photos = new Map<number, Photo>();
  private audios = new Map<number, Audio>();
  private videos = new Map<number, Video>();
  private uploadedVideos = new Map<number, UploadedVideo>();
  private savedVoices = new Map<number, SavedVoice>();
  private logos = new Map<number, Logo>();
  private savedLogos = new Map<number, SavedLogo>();
  private appSettings: AppSettings | undefined;
  private userPreferences: UserPreferences | undefined;
  private backgroundMusicList = new Map<number, BackgroundMusic>();
  private idCounter = 1;

  // User methods (simples para testing)
  async getUser(id: number): Promise<User | undefined> {
    return undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }
  async createUser(user: InsertUser): Promise<User> {
    return { id: this.idCounter++, ...user } as User;
  }

  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    const newProject = { ...project, createdAt: new Date().toISOString() } as Project;
    this.projects.set(project.id, newProject);
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error("Project not found");
    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => !p.isTemplate);
  }

  async getTemplates(): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.isTemplate);
  }

  async getLatestTemplate(): Promise<Project | undefined> {
    const templates = await this.getTemplates();
    return templates.length > 0 ? templates[templates.length - 1] : undefined;
  }

  // Photo methods
  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const newPhoto = { ...photo, id: this.idCounter++, createdAt: new Date().toISOString() } as Photo;
    this.photos.set(newPhoto.id, newPhoto);
    return newPhoto;
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async getPhotosByProjectId(projectId: string): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(p => p.projectId === projectId);
  }

  async deletePhoto(id: number): Promise<boolean> {
    return this.photos.delete(id);
  }

  // Audio methods
  async createAudio(audio: InsertAudio): Promise<Audio> {
    const newAudio = { ...audio, id: this.idCounter++, createdAt: new Date().toISOString() } as Audio;
    this.audios.set(newAudio.id, newAudio);
    return newAudio;
  }

  async getAudio(id: number): Promise<Audio | undefined> {
    return this.audios.get(id);
  }

  async getAudioByProjectId(projectId: string): Promise<Audio | undefined> {
    return Array.from(this.audios.values()).find(a => a.projectId === projectId);
  }

  async deleteAudio(id: number): Promise<boolean> {
    return this.audios.delete(id);
  }

  // Video methods
  async createVideo(video: InsertVideo): Promise<Video> {
    const newVideo = { ...video, id: this.idCounter++, createdAt: new Date().toISOString() } as Video;
    this.videos.set(newVideo.id, newVideo);
    return newVideo;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoByProjectId(projectId: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(v => v.projectId === projectId);
  }

  async getVideosByProjectId(projectId: string): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(v => v.projectId === projectId);
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }

  // Stubs para otros métodos requeridos por la interfaz
  async getFavoriteVoice(): Promise<UserPreferences | undefined> { return this.userPreferences; }
  async saveFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    this.userPreferences = { ...preferences, id: this.idCounter++, createdAt: new Date().toISOString() } as UserPreferences;
    return this.userPreferences;
  }
  async updateFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    return this.saveFavoriteVoice(preferences);
  }

  async getSavedVoices(): Promise<SavedVoice[]> { return Array.from(this.savedVoices.values()); }
  async getSavedVoice(id: number): Promise<SavedVoice | undefined> { return this.savedVoices.get(id); }
  async getSavedVoiceByPosition(position: number): Promise<SavedVoice | undefined> {
    return Array.from(this.savedVoices.values()).find(v => v.position === position);
  }
  async getDefaultSavedVoice(): Promise<SavedVoice | undefined> {
    return Array.from(this.savedVoices.values()).find(v => v.isDefault);
  }
  async saveSavedVoice(voice: InsertSavedVoice): Promise<SavedVoice> {
    const newVoice = { ...voice, id: this.idCounter++, createdAt: new Date().toISOString() } as SavedVoice;
    this.savedVoices.set(newVoice.id, newVoice);
    return newVoice;
  }
  async updateSavedVoice(id: number, voice: Partial<InsertSavedVoice>): Promise<SavedVoice> {
    const existing = this.savedVoices.get(id);
    if (!existing) throw new Error("Voice not found");
    const updated = { ...existing, ...voice };
    this.savedVoices.set(id, updated);
    return updated;
  }
  async deleteSavedVoice(id: number): Promise<boolean> { return this.savedVoices.delete(id); }

  async getLogos(): Promise<Logo[]> { return Array.from(this.logos.values()); }
  async getLogo(id: number): Promise<Logo | undefined> { return this.logos.get(id); }
  async createLogo(logo: InsertLogo): Promise<Logo> {
    const newLogo = { ...logo, id: this.idCounter++, createdAt: new Date().toISOString() } as Logo;
    this.logos.set(newLogo.id, newLogo);
    return newLogo;
  }
  async deleteLogo(id: number): Promise<boolean> { return this.logos.delete(id); }

  async getSavedLogos(): Promise<SavedLogo[]> { return Array.from(this.savedLogos.values()); }
  async getSavedLogo(id: number): Promise<SavedLogo | undefined> { return this.savedLogos.get(id); }
  async getSavedLogoByPosition(position: number): Promise<SavedLogo | undefined> {
    return Array.from(this.savedLogos.values()).find(l => l.position === position);
  }
  async getDefaultSavedLogo(): Promise<SavedLogo | undefined> {
    return Array.from(this.savedLogos.values()).find(l => l.isDefault);
  }
  async saveSavedLogo(logo: InsertSavedLogo): Promise<SavedLogo> {
    const newLogo = { ...logo, id: this.idCounter++, createdAt: new Date().toISOString() } as SavedLogo;
    this.savedLogos.set(newLogo.id, newLogo);
    return newLogo;
  }
  async updateSavedLogo(id: number, logo: Partial<InsertSavedLogo>): Promise<SavedLogo> {
    const existing = this.savedLogos.get(id);
    if (!existing) throw new Error("Logo not found");
    const updated = { ...existing, ...logo };
    this.savedLogos.set(id, updated);
    return updated;
  }
  async deleteSavedLogo(id: number): Promise<boolean> { return this.savedLogos.delete(id); }

  async getAppSettings(): Promise<AppSettings | undefined> { return this.appSettings; }
  async saveAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    this.appSettings = { ...settings, id: this.idCounter++, createdAt: new Date().toISOString() } as AppSettings;
    return this.appSettings;
  }
  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    if (!this.appSettings) throw new Error("No app settings found");
    this.appSettings = { ...this.appSettings, ...settings };
    return this.appSettings;
  }

  async getBackgroundMusic(): Promise<BackgroundMusic[]> { return Array.from(this.backgroundMusicList.values()); }
  async getBackgroundMusicById(id: number): Promise<BackgroundMusic | undefined> { return this.backgroundMusicList.get(id); }
  async createBackgroundMusic(music: InsertBackgroundMusic): Promise<BackgroundMusic> {
    const newMusic = { ...music, id: this.idCounter++, createdAt: new Date().toISOString() } as BackgroundMusic;
    this.backgroundMusicList.set(newMusic.id, newMusic);
    return newMusic;
  }
  async deleteBackgroundMusic(id: number): Promise<boolean> { return this.backgroundMusicList.delete(id); }

  async createUploadedVideo(video: InsertUploadedVideo): Promise<UploadedVideo> {
    const newVideo = { ...video, id: this.idCounter++, createdAt: new Date().toISOString() } as UploadedVideo;
    this.uploadedVideos.set(newVideo.id, newVideo);
    return newVideo;
  }
  async getUploadedVideo(id: number): Promise<UploadedVideo | undefined> { return this.uploadedVideos.get(id); }
  async getUploadedVideosByProjectId(projectId: string): Promise<UploadedVideo[]> {
    return Array.from(this.uploadedVideos.values()).filter(v => v.projectId === projectId);
  }
  async deleteUploadedVideo(id: number): Promise<boolean> { return this.uploadedVideos.delete(id); }
}

import fs from 'fs';
import path from 'path';

// Implementación mejorada con persistencia en archivos JSON para simular SQL
class PersistentStorage implements IStorage {
  private dataFile = '';
  private data: any = {
    projects: {},
    photos: {},
    audios: {},
    videos: {},
    uploadedVideos: {},
    savedVoices: {},
    logos: {},
    savedLogos: {},
    appSettings: null,
    userPreferences: null,
    backgroundMusic: {},
    idCounter: 1
  };

  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'storage.json');
    console.log("PersistentStorage initialized. Data file:", this.dataFile);
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const rawData = fs.readFileSync(this.dataFile, 'utf8');
        this.data = JSON.parse(rawData);
        console.log("Data loaded successfully.");
      } else {
        console.log("Data file does not exist, starting with empty data.");
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private saveData() {
    try {
      const dir = path.dirname(this.dataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log("Created data directory:", dir);
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }
  async createUser(user: InsertUser): Promise<User> {
    return { id: this.data.idCounter++, ...user } as User;
  }

  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    const newProject = {
      ...project,
      createdAt: new Date().toISOString(),
      isTemplate: project.isTemplate || false
    } as Project;
    this.data.projects[project.id] = newProject;
    this.saveData();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.data.projects[id];
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const existing = this.data.projects[id];
    if (!existing) throw new Error("Project not found");
    const updated = { ...existing, ...project };
    this.data.projects[id] = updated;
    this.saveData();
    return updated;
  }

  async getAllProjects(): Promise<Project[]> {
    return Object.values(this.data.projects).filter((p: any) => !p.isTemplate) as Project[];
  }

  async getTemplates(): Promise<Project[]> {
    return Object.values(this.data.projects).filter((p: any) => p.isTemplate) as Project[];
  }

  async getLatestTemplate(): Promise<Project | undefined> {
    const templates = await this.getTemplates();
    return templates.length > 0 ? templates[templates.length - 1] : undefined;
  }

  // Photo methods
  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const newPhoto = {
      ...photo,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as Photo;
    this.data.photos[newPhoto.id] = newPhoto;
    this.saveData();
    return newPhoto;
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.data.photos[id];
  }

  async getPhotosByProjectId(projectId: string): Promise<Photo[]> {
    return Object.values(this.data.photos).filter((p: any) => p.projectId === projectId);
  }

  async deletePhoto(id: number): Promise<boolean> {
    const existed = delete this.data.photos[id];
    if (existed) this.saveData();
    return existed;
  }

  // Audio methods
  async createAudio(audio: InsertAudio): Promise<Audio> {
    const newAudio = {
      ...audio,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as Audio;
    this.data.audios[newAudio.id] = newAudio;
    this.saveData();
    return newAudio;
  }

  async getAudio(id: number): Promise<Audio | undefined> {
    return this.data.audios[id];
  }

  async getAudioByProjectId(projectId: string): Promise<Audio | undefined> {
    return Object.values(this.data.audios).find((a: any) => a.projectId === projectId);
  }

  async deleteAudio(id: number): Promise<boolean> {
    if (this.data.audios[id]) {
      delete this.data.audios[id];
      this.saveData();
      return true;
    }
    return false;
  }

  // Video methods
  async createVideo(video: InsertVideo): Promise<Video> {
    const newVideo = {
      ...video,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as Video;
    this.data.videos[newVideo.id] = newVideo;
    this.saveData();
    return newVideo;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.data.videos[id];
  }

  async getVideoByProjectId(projectId: string): Promise<Video | undefined> {
    return Object.values(this.data.videos).find((v: any) => v.projectId === projectId);
  }

  async getVideosByProjectId(projectId: string): Promise<Video[]> {
    return Object.values(this.data.videos).filter((v: any) => v.projectId === projectId);
  }

  async getAllVideos(): Promise<Video[]> {
    return Object.values(this.data.videos);
  }

  // Uploaded Video methods
  async createUploadedVideo(video: InsertUploadedVideo): Promise<UploadedVideo> {
    const newVideo = {
      ...video,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as UploadedVideo;
    this.data.uploadedVideos[newVideo.id] = newVideo;
    this.saveData();
    return newVideo;
  }

  async getUploadedVideo(id: number): Promise<UploadedVideo | undefined> {
    return this.data.uploadedVideos[id];
  }

  async getUploadedVideosByProjectId(projectId: string): Promise<UploadedVideo[]> {
    return Object.values(this.data.uploadedVideos).filter((v: any) => v.projectId === projectId);
  }

  async deleteUploadedVideo(id: number): Promise<boolean> {
    const existed = delete this.data.uploadedVideos[id];
    if (existed) this.saveData();
    return existed;
  }

  // Implementaciones simplificadas para otros métodos requeridos
  async getFavoriteVoice(): Promise<UserPreferences | undefined> {
    return this.data.userPreferences;
  }

  async saveFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    this.data.userPreferences = {
      ...preferences,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as UserPreferences;
    this.saveData();
    return this.data.userPreferences;
  }

  async updateFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    return this.saveFavoriteVoice(preferences);
  }

  async getSavedVoices(): Promise<SavedVoice[]> {
    return Object.values(this.data.savedVoices);
  }

  async getSavedVoice(id: number): Promise<SavedVoice | undefined> {
    return this.data.savedVoices[id];
  }

  async getSavedVoiceByPosition(position: number): Promise<SavedVoice | undefined> {
    return Object.values(this.data.savedVoices).find((v: any) => v.position === position);
  }

  async getDefaultSavedVoice(): Promise<SavedVoice | undefined> {
    return Object.values(this.data.savedVoices).find((v: any) => v.isDefault);
  }

  async saveSavedVoice(voice: InsertSavedVoice): Promise<SavedVoice> {
    const newVoice = {
      ...voice,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as SavedVoice;
    this.data.savedVoices[newVoice.id] = newVoice;
    this.saveData();
    return newVoice;
  }

  async updateSavedVoice(id: number, voice: Partial<InsertSavedVoice>): Promise<SavedVoice> {
    const existing = this.data.savedVoices[id];
    if (!existing) throw new Error("Voice not found");
    const updated = { ...existing, ...voice };
    this.data.savedVoices[id] = updated;
    this.saveData();
    return updated;
  }

  async deleteSavedVoice(id: number): Promise<boolean> {
    const existed = delete this.data.savedVoices[id];
    if (existed) this.saveData();
    return existed;
  }

  async getLogos(): Promise<Logo[]> {
    return Object.values(this.data.logos);
  }

  async getLogo(id: number): Promise<Logo | undefined> {
    return this.data.logos[id];
  }

  async createLogo(logo: InsertLogo): Promise<Logo> {
    const newLogo = {
      ...logo,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as Logo;
    this.data.logos[newLogo.id] = newLogo;
    this.saveData();
    return newLogo;
  }

  async deleteLogo(id: number): Promise<boolean> {
    const existed = delete this.data.logos[id];
    if (existed) this.saveData();
    return existed;
  }

  async getSavedLogos(): Promise<SavedLogo[]> {
    return Object.values(this.data.savedLogos);
  }

  async getSavedLogo(id: number): Promise<SavedLogo | undefined> {
    return this.data.savedLogos[id];
  }

  async getSavedLogoByPosition(position: number): Promise<SavedLogo | undefined> {
    return Object.values(this.data.savedLogos).find((l: any) => l.position === position);
  }

  async getDefaultSavedLogo(): Promise<SavedLogo | undefined> {
    return Object.values(this.data.savedLogos).find((l: any) => l.isDefault);
  }

  async saveSavedLogo(logo: InsertSavedLogo): Promise<SavedLogo> {
    const newLogo = {
      ...logo,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as SavedLogo;
    this.data.savedLogos[newLogo.id] = newLogo;
    this.saveData();
    return newLogo;
  }

  async updateSavedLogo(id: number, logo: Partial<InsertSavedLogo>): Promise<SavedLogo> {
    const existing = this.data.savedLogos[id];
    if (!existing) throw new Error("Logo not found");
    const updated = { ...existing, ...logo };
    this.data.savedLogos[id] = updated;
    this.saveData();
    return updated;
  }

  async deleteSavedLogo(id: number): Promise<boolean> {
    const existed = delete this.data.savedLogos[id];
    if (existed) this.saveData();
    return existed;
  }

  async getAppSettings(): Promise<AppSettings | undefined> {
    return this.data.appSettings;
  }

  async saveAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    this.data.appSettings = {
      ...settings,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as AppSettings;
    this.saveData();
    return this.data.appSettings;
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    if (!this.data.appSettings) throw new Error("No app settings found");
    this.data.appSettings = { ...this.data.appSettings, ...settings };
    this.saveData();
    return this.data.appSettings;
  }

  async getBackgroundMusic(): Promise<BackgroundMusic[]> {
    return Object.values(this.data.backgroundMusic);
  }

  async getBackgroundMusicById(id: number): Promise<BackgroundMusic | undefined> {
    return this.data.backgroundMusic[id];
  }

  async createBackgroundMusic(music: InsertBackgroundMusic): Promise<BackgroundMusic> {
    const newMusic = {
      ...music,
      id: this.data.idCounter++,
      createdAt: new Date().toISOString()
    } as BackgroundMusic;
    this.data.backgroundMusic[newMusic.id] = newMusic;
    this.saveData();
    return newMusic;
  }

  async deleteBackgroundMusic(id: number): Promise<boolean> {
    const existed = delete this.data.backgroundMusic[id];
    if (existed) this.saveData();
    return existed;
  }
}

// Usar almacenamiento persistente basado en JSON
export const storage = new PersistentStorage();