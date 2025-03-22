import { 
  Photo, InsertPhoto, 
  Audio, InsertAudio, 
  Video, InsertVideo, 
  Project, InsertProject,
  User, InsertUser,
  UserPreferences, InsertUserPreferences,
  SavedVoice, InsertSavedVoice,
  AppSettings, InsertAppSettings
} from "@shared/schema";

// Modify the interface with any CRUD methods you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  
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
  
  // App Settings methods
  getAppSettings(): Promise<AppSettings | undefined>;
  saveAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<string, Project>;
  private photos: Map<number, Photo>;
  private audios: Map<number, Audio>;
  private videos: Map<number, Video>;
  private userPreferences: UserPreferences | undefined;
  private savedVoices: Map<number, SavedVoice>;
  private appSettings: AppSettings | undefined;
  
  private userId: number;
  private photoId: number;
  private audioId: number;
  private videoId: number;
  private preferenceId: number;
  private savedVoiceId: number;
  private appSettingsId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.photos = new Map();
    this.audios = new Map();
    this.videos = new Map();
    this.savedVoices = new Map();
    
    this.userId = 1;
    this.photoId = 1;
    this.audioId = 1;
    this.videoId = 1;
    this.preferenceId = 1;
    this.savedVoiceId = 1;
    this.appSettingsId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    this.projects.set(project.id, project as Project);
    return project as Project;
  }
  
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  // Photo methods
  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const id = this.photoId++;
    const newPhoto: Photo = { ...photo, id };
    this.photos.set(id, newPhoto);
    return newPhoto;
  }
  
  async getPhoto(id: number): Promise<Photo | undefined> {
    return this.photos.get(id);
  }
  
  async getPhotosByProjectId(projectId: string): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(
      (photo) => photo.projectId === projectId
    );
  }
  
  async deletePhoto(id: number): Promise<boolean> {
    return this.photos.delete(id);
  }
  
  // Audio methods
  async createAudio(audio: InsertAudio): Promise<Audio> {
    const id = this.audioId++;
    const newAudio: Audio = { 
      ...audio, 
      id,
      duration: audio.duration || null // Ensure duration is never undefined
    };
    this.audios.set(id, newAudio);
    return newAudio;
  }
  
  async getAudio(id: number): Promise<Audio | undefined> {
    return this.audios.get(id);
  }
  
  async getAudioByProjectId(projectId: string): Promise<Audio | undefined> {
    return Array.from(this.audios.values()).find(
      (audio) => audio.projectId === projectId
    );
  }
  
  // Video methods
  async createVideo(video: InsertVideo): Promise<Video> {
    const id = this.videoId++;
    const newVideo: Video = { 
      ...video, 
      id,
      duration: video.duration || null // Ensure duration is never undefined
    };
    this.videos.set(id, newVideo);
    return newVideo;
  }
  
  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }
  
  async getVideoByProjectId(projectId: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(
      (video) => video.projectId === projectId
    );
  }
  
  // User Preferences methods
  async getFavoriteVoice(): Promise<UserPreferences | undefined> {
    return this.userPreferences;
  }
  
  async saveFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = this.preferenceId++;
    const newPreferences: UserPreferences = { ...preferences, id };
    this.userPreferences = newPreferences;
    return newPreferences;
  }
  
  async updateFavoriteVoice(preferences: InsertUserPreferences): Promise<UserPreferences> {
    if (!this.userPreferences) {
      return this.saveFavoriteVoice(preferences);
    }
    
    const updatedPreferences: UserPreferences = { 
      ...preferences, 
      id: this.userPreferences.id 
    };
    
    this.userPreferences = updatedPreferences;
    return updatedPreferences;
  }
  
  // Saved Voices methods
  async getSavedVoices(): Promise<SavedVoice[]> {
    return Array.from(this.savedVoices.values());
  }
  
  async getSavedVoice(id: number): Promise<SavedVoice | undefined> {
    return this.savedVoices.get(id);
  }
  
  async getSavedVoiceByPosition(position: number): Promise<SavedVoice | undefined> {
    return Array.from(this.savedVoices.values()).find(
      voice => voice.position === position
    );
  }
  
  async getDefaultSavedVoice(): Promise<SavedVoice | undefined> {
    return Array.from(this.savedVoices.values()).find(
      voice => voice.isDefault === true
    );
  }
  
  async saveSavedVoice(voice: InsertSavedVoice): Promise<SavedVoice> {
    const id = this.savedVoiceId++;
    
    // Asegurarse de que todos los campos requeridos estén presentes
    const newVoice: SavedVoice = { 
      ...voice, 
      id,
      position: voice.position ?? 0,
      displayName: voice.displayName ?? null,
      isDefault: voice.isDefault ?? false
    };
    
    // Si es marcada como default, actualizar cualquier otra voz default a false
    if (newVoice.isDefault) {
      for (const [voiceId, existingVoice] of Array.from(this.savedVoices.entries())) {
        if (existingVoice.isDefault && voiceId !== id) {
          this.savedVoices.set(voiceId, { ...existingVoice, isDefault: false });
        }
      }
    }
    
    // Asegurarse que no haya duplicados en la misma posición
    for (const [voiceId, existingVoice] of Array.from(this.savedVoices.entries())) {
      if (existingVoice.position === newVoice.position && voiceId !== id) {
        // Mover la voz existente a otra posición
        const newPosition = (existingVoice.position + 1) % 3;
        this.savedVoices.set(voiceId, { ...existingVoice, position: newPosition });
      }
    }
    
    this.savedVoices.set(id, newVoice);
    return newVoice;
  }
  
  async updateSavedVoice(id: number, voice: Partial<InsertSavedVoice>): Promise<SavedVoice> {
    const existingVoice = this.savedVoices.get(id);
    if (!existingVoice) {
      throw new Error(`Voice with id ${id} not found`);
    }
    
    // Si se actualiza a default, actualizar cualquier otra voz default a false
    if (voice.isDefault) {
      for (const [voiceId, otherVoice] of Array.from(this.savedVoices.entries())) {
        if (otherVoice.isDefault && voiceId !== id) {
          this.savedVoices.set(voiceId, { ...otherVoice, isDefault: false });
        }
      }
    }
    
    // Asegurarse que no haya duplicados en la misma posición
    if (typeof voice.position === 'number' && voice.position !== existingVoice.position) {
      for (const [voiceId, otherVoice] of Array.from(this.savedVoices.entries())) {
        if (otherVoice.position === voice.position && voiceId !== id) {
          // Mover la otra voz a la posición de la voz actual
          this.savedVoices.set(voiceId, { ...otherVoice, position: existingVoice.position });
        }
      }
    }
    
    const updatedVoice: SavedVoice = { ...existingVoice, ...voice };
    this.savedVoices.set(id, updatedVoice);
    return updatedVoice;
  }
  
  async deleteSavedVoice(id: number): Promise<boolean> {
    return this.savedVoices.delete(id);
  }
  
  // App Settings methods
  async getAppSettings(): Promise<AppSettings | undefined> {
    return this.appSettings;
  }
  
  async saveAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    const id = this.appSettingsId++;
    
    // Asegurarse que todos los campos requeridos estén presentes con valores por defecto
    const newSettings: AppSettings = { 
      ...settings, 
      id,
      selectedLogoId: settings.selectedLogoId ?? 1,
      logoPosition: settings.logoPosition ?? "top-right",
      showTitle: settings.showTitle ?? true,
      titleFontSize: settings.titleFontSize ?? 32,
      titleColor: settings.titleColor ?? "#ffffff",
      titlePosition: settings.titlePosition ?? "top-center"
    };
    
    this.appSettings = newSettings;
    return newSettings;
  }
  
  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    if (!this.appSettings) {
      return this.saveAppSettings({
        selectedLogoId: settings.selectedLogoId ?? 1,
        logoPosition: settings.logoPosition ?? "top-right", 
        showTitle: settings.showTitle ?? true,
        titleFontSize: settings.titleFontSize ?? 32,
        titleColor: settings.titleColor ?? "#ffffff",
        titlePosition: settings.titlePosition ?? "top-center",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    const updatedSettings: AppSettings = { 
      ...this.appSettings, 
      ...settings,
      updatedAt: settings.updatedAt ?? new Date().toISOString()
    };
    
    this.appSettings = updatedSettings;
    return updatedSettings;
  }
}

export const storage = new MemStorage();
