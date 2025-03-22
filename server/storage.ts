import { 
  Photo, InsertPhoto, 
  Audio, InsertAudio, 
  Video, InsertVideo, 
  Project, InsertProject,
  User, InsertUser
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<string, Project>;
  private photos: Map<number, Photo>;
  private audios: Map<number, Audio>;
  private videos: Map<number, Video>;
  
  private userId: number;
  private photoId: number;
  private audioId: number;
  private videoId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.photos = new Map();
    this.audios = new Map();
    this.videos = new Map();
    
    this.userId = 1;
    this.photoId = 1;
    this.audioId = 1;
    this.videoId = 1;
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
    const newAudio: Audio = { ...audio, id };
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
    const newVideo: Video = { ...video, id };
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
}

export const storage = new MemStorage();
