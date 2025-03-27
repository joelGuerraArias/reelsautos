import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import multer from "multer";
import { nanoid } from "nanoid";
import axios from "axios";
import { promisify } from "util";
import child_process from "child_process";
import {
  insertPhotoSchema,
  insertAudioSchema,
  insertVideoSchema,
  insertProjectSchema,
  insertLogoSchema,
  insertBackgroundMusicSchema,
  insertUploadedVideoSchema,
  generateAudioSchema,
  generateVideoSchema,
  PhotoValidationResponse
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const exec = promisify(child_process.exec);
const execSync = child_process.execSync;

// Set up directories for file storage
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const PHOTO_DIR = path.join(UPLOAD_DIR, "photos");
const AUDIO_DIR = path.join(UPLOAD_DIR, "audios");
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");
const LOGO_DIR = path.join(UPLOAD_DIR, "logos");
const UPLOADED_VIDEO_DIR = path.join(UPLOAD_DIR, "uploaded_videos");
const BACKGROUND_MUSIC_DIR = path.join(UPLOAD_DIR, "background_music");

// Create directories if they don't exist
fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(LOGO_DIR, { recursive: true });
fs.mkdirSync(UPLOADED_VIDEO_DIR, { recursive: true });
fs.mkdirSync(BACKGROUND_MUSIC_DIR, { recursive: true });

// Configure multer for file uploads
// Configuración para fotos
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PHOTO_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
      return;
    }
  },
});

// Configuración para logos
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, LOGO_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"));
      return;
    }
  },
});

// Configuración para videos subidos
const uploadedVideoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADED_VIDEO_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const videoUpload = multer({
  storage: uploadedVideoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    // Accept only videos
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de video"));
      return;
    }
  },
});

// Configuración para música de fondo
const backgroundMusicStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, BACKGROUND_MUSIC_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const musicUpload = multer({
  storage: backgroundMusicStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de audio"));
      return;
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS middleware for development
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  
  // Get available voices from Eleven Labs API
  app.get("/api/voices", async (req, res) => {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Eleven Labs API key not configured" });
      }
      
      const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        }
      });
      
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching voices:", error);
      
      if (axios.isAxiosError(error)) {
        res.status(error.response?.status || 500).json({ 
          error: "Failed to fetch voices from Eleven Labs API",
          details: error.response?.data
        });
      } else {
        res.status(500).json({ error: "Failed to fetch voices" });
      }
    }
  });

  // Create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  // Get a project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  // Validate image dimensions
  app.post("/api/photos/validate", photoUpload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ isValid: false, error: "No file uploaded" });
      }

      // Use FFmpeg to check image dimensions
      const filePath = req.file.path;
      const { stdout } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`);
      
      const [width, height] = stdout.trim().split('x').map(Number);
      let response: PhotoValidationResponse = { isValid: true };
      
      // Check if dimensions match 16:9 aspect ratio
      const aspectRatio = width / height;
      const targetRatio = 16 / 9;
      const ratioTolerance = 0.01; // Allow small deviation from exact ratio
      
      if (Math.abs(aspectRatio - targetRatio) > ratioTolerance) {
        response = { 
          isValid: false, 
          error: `Invalid aspect ratio. Expected 16:9 (${targetRatio.toFixed(2)}), got ${aspectRatio.toFixed(2)}` 
        };
      }
      
      // Clean up the file if it's invalid
      if (!response.isValid) {
        fs.unlinkSync(filePath);
      }
      
      res.json(response);
    } catch (error) {
      // Clean up the file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ isValid: false, error: "Failed to validate photo" });
    }
  });

  // Upload a photo
  app.post("/api/photos", photoUpload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const photoData = {
        filename: req.file.originalname,
        filepath: req.file.path,
        width: parseInt(req.body.width),
        height: parseInt(req.body.height),
        size: req.file.size,
        projectId: req.body.projectId,
        createdAt: new Date().toISOString(),
      };

      const parsedData = insertPhotoSchema.parse(photoData);
      const photo = await storage.createPhoto(parsedData);
      res.status(201).json(photo);
    } catch (error) {
      // Clean up the file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to upload photo" });
      }
    }
  });

  // Get photos by project ID
  app.get("/api/projects/:id/photos", async (req, res) => {
    try {
      const projectId = req.params.id;
      const photos = await storage.getPhotosByProjectId(projectId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get photos" });
    }
  });

  // Delete a photo
  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const photo = await storage.getPhoto(photoId);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      // Delete the file
      fs.unlinkSync(photo.filepath);
      
      // Remove from storage
      const deleted = await storage.deletePhoto(photoId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete photo" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Generate audio from text using Eleven Labs API
  app.post("/api/audios", async (req, res) => {
    try {
      const validatedData = generateAudioSchema.parse(req.body);
      const { text, voice, projectId } = validatedData;
      
      // Call Eleven Labs API to generate audio
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Eleven Labs API key not configured" });
      }
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
          },
          responseType: "arraybuffer"
        }
      );
      
      // Save the audio file
      const filename = `audio_${nanoid()}.mp3`;
      const filepath = path.join(AUDIO_DIR, filename);
      
      fs.writeFileSync(filepath, response.data);
      
      // Get audio duration using FFmpeg
      const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`);
      const duration = Math.round(parseFloat(stdout.trim()));
      
      // Save audio record
      const audioData = {
        filename,
        filepath,
        text,
        voice,
        duration,
        projectId,
        createdAt: new Date().toISOString()
      };
      
      const parsedData = insertAudioSchema.parse(audioData);
      const audio = await storage.createAudio(parsedData);
      
      res.status(201).json(audio);
    } catch (error) {
      console.error("Audio generation error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (axios.isAxiosError(error)) {
        res.status(error.response?.status || 500).json({ 
          error: "Failed to generate audio from Eleven Labs API",
          details: error.response?.data
        });
      } else {
        res.status(500).json({ error: "Failed to generate audio" });
      }
    }
  });

  // Get audio by project ID
  app.get("/api/projects/:id/audio", async (req, res) => {
    try {
      const projectId = req.params.id;
      const audio = await storage.getAudioByProjectId(projectId);
      
      if (!audio) {
        return res.status(404).json({ error: "Audio not found for this project" });
      }
      
      res.json(audio);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audio" });
    }
  });

  // Stream audio file
  app.get("/api/audios/:id/stream", async (req, res) => {
    try {
      const audioId = parseInt(req.params.id);
      const audio = await storage.getAudio(audioId);
      
      if (!audio) {
        return res.status(404).json({ error: "Audio not found" });
      }
      
      // Stream the audio file
      const stat = fs.statSync(audio.filepath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(audio.filepath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
        });
        
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
        });
        
        fs.createReadStream(audio.filepath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stream audio" });
    }
  });
  
  // API para gestionar logos
  
  // Obtener todos los logos
  app.get("/api/logos", async (req, res) => {
    try {
      const logos = await storage.getLogos();
      res.json(logos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logos" });
    }
  });
  
  // Obtener logo por ID
  app.get("/api/logos/:id", async (req, res) => {
    try {
      const logoId = parseInt(req.params.id);
      const logo = await storage.getLogo(logoId);
      
      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }
      
      res.json(logo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logo" });
    }
  });
  
  // Obtener archivo de logo por ID
  app.get("/api/logos/:id/file", async (req, res) => {
    try {
      const logoId = parseInt(req.params.id);
      const logo = await storage.getLogo(logoId);
      
      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }
      
      res.sendFile(logo.filepath);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logo file" });
    }
  });
  
  // Subir un nuevo logo
  app.post("/api/logos", logoUpload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const logoData = {
        name: req.body.name || req.file.originalname,
        filename: req.file.originalname,
        filepath: req.file.path,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const parsedData = insertLogoSchema.parse(logoData);
      const logo = await storage.createLogo(parsedData);
      res.status(201).json(logo);
    } catch (error) {
      // Limpiar el archivo en caso de error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to upload logo" });
      }
    }
  });
  
  // Eliminar un logo
  app.delete("/api/logos/:id", async (req, res) => {
    try {
      const logoId = parseInt(req.params.id);
      const logo = await storage.getLogo(logoId);
      
      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }
      
      // Verificar si el logo está en uso en la configuración de la aplicación
      const appSettings = await storage.getAppSettings();
      if (appSettings && appSettings.selectedLogoId === logoId) {
        return res.status(400).json({ 
          error: "Cannot delete logo that is currently in use. Please select another logo in app settings first." 
        });
      }
      
      // Eliminar el archivo
      fs.unlinkSync(logo.filepath);
      
      // Eliminar de almacenamiento
      const deleted = await storage.deleteLogo(logoId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete logo" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete logo" });
    }
  });

  // API para gestionar videos subidos
  
  // Validar video
  app.post("/api/uploaded-videos/validate", videoUpload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ isValid: false, error: "No se ha subido ningún archivo" });
      }
      
      // Usar FFmpeg para verificar las dimensiones y duración del video
      const filePath = req.file.path;
      
      // Obtener dimensiones del video
      const { stdout: dimensionsOutput } = await exec(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`
      );
      
      const [width, height] = dimensionsOutput.trim().split('x').map(Number);
      
      // Obtener duración del video
      const { stdout: durationOutput } = await exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      
      const duration = Math.round(parseFloat(durationOutput.trim()));
      
      // Verificar relación de aspecto
      const aspectRatio = width / height;
      const targetRatio = 16 / 9;
      const ratioTolerance = 0.1; // Mayor tolerancia para videos
      
      if (Math.abs(aspectRatio - targetRatio) > ratioTolerance) {
        // Eliminar el archivo si no es válido
        fs.unlinkSync(filePath);
        return res.status(400).json({
          isValid: false,
          error: `Relación de aspecto inválida. Se esperaba 16:9 (${targetRatio.toFixed(2)}), pero es ${aspectRatio.toFixed(2)}`
        });
      }
      
      res.json({
        isValid: true,
        width,
        height,
        duration
      });
    } catch (error) {
      console.error("Error al validar el video:", error);
      
      // Limpiar el archivo en caso de error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ isValid: false, error: "No se pudo validar el video" });
    }
  });
  
  // Subir un video
  app.post("/api/uploaded-videos", videoUpload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se ha subido ningún archivo" });
      }
      
      // Obtener dimensiones y duración del video
      const filePath = req.file.path;
      
      // Obtener dimensiones
      const { stdout: dimensionsOutput } = await exec(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`
      );
      
      const [width, height] = dimensionsOutput.trim().split('x').map(Number);
      
      // Obtener duración
      const { stdout: durationOutput } = await exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      
      const duration = Math.round(parseFloat(durationOutput.trim()));
      
      const videoData = {
        filename: req.file.originalname,
        filepath: req.file.path,
        width,
        height,
        size: req.file.size,
        duration,
        projectId: req.body.projectId,
        createdAt: new Date().toISOString(),
      };
      
      const parsedData = insertUploadedVideoSchema.parse(videoData);
      const video = await storage.createUploadedVideo(parsedData);
      res.status(201).json(video);
    } catch (error) {
      // Limpiar el archivo en caso de error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error al subir el video:", error);
        res.status(500).json({ error: "No se pudo subir el video" });
      }
    }
  });
  
  // Obtener videos subidos por ID de proyecto
  app.get("/api/projects/:id/uploaded-videos", async (req, res) => {
    try {
      const projectId = req.params.id;
      const videos = await storage.getUploadedVideosByProjectId(projectId);
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "No se pudieron obtener los videos" });
    }
  });
  
  // Eliminar un video subido
  app.delete("/api/uploaded-videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getUploadedVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video no encontrado" });
      }
      
      // Eliminar el archivo
      fs.unlinkSync(video.filepath);
      
      // Eliminar del almacenamiento
      const deleted = await storage.deleteUploadedVideo(videoId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "No se pudo eliminar el video" });
      }
    } catch (error) {
      res.status(500).json({ error: "No se pudo eliminar el video" });
    }
  });
  
  // API para gestionar música de fondo
  
  // Subir música de fondo
  app.post("/api/background-music", musicUpload.single("music"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se ha subido ningún archivo" });
      }
      
      // Obtener duración de la música
      const filePath = req.file.path;
      const { stdout } = await exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      
      const duration = Math.round(parseFloat(stdout.trim()));
      
      const musicData = {
        name: req.body.name || req.file.originalname,
        filename: req.file.originalname,
        filepath: req.file.path,
        duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const parsedData = insertBackgroundMusicSchema.parse(musicData);
      const music = await storage.createBackgroundMusic(parsedData);
      res.status(201).json(music);
    } catch (error) {
      // Limpiar el archivo en caso de error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error al subir la música:", error);
        res.status(500).json({ error: "No se pudo subir la música de fondo" });
      }
    }
  });
  
  // Obtener toda la música de fondo
  app.get("/api/background-music", async (req, res) => {
    try {
      const music = await storage.getBackgroundMusic();
      res.json(music);
    } catch (error) {
      res.status(500).json({ error: "No se pudo obtener la música de fondo" });
    }
  });
  
  // Obtener una música de fondo por ID
  app.get("/api/background-music/:id", async (req, res) => {
    try {
      const musicId = parseInt(req.params.id);
      const music = await storage.getBackgroundMusicById(musicId);
      
      if (!music) {
        return res.status(404).json({ error: "Música no encontrada" });
      }
      
      res.json(music);
    } catch (error) {
      res.status(500).json({ error: "No se pudo obtener la música de fondo" });
    }
  });
  
  // Eliminar una música de fondo
  app.delete("/api/background-music/:id", async (req, res) => {
    try {
      const musicId = parseInt(req.params.id);
      const music = await storage.getBackgroundMusicById(musicId);
      
      if (!music) {
        return res.status(404).json({ error: "Música no encontrada" });
      }
      
      // Eliminar el archivo
      fs.unlinkSync(music.filepath);
      
      // Eliminar del almacenamiento
      const deleted = await storage.deleteBackgroundMusic(musicId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "No se pudo eliminar la música de fondo" });
      }
    } catch (error) {
      res.status(500).json({ error: "No se pudo eliminar la música de fondo" });
    }
  });
  
  // Generate video from photos and audio
  app.post("/api/videos", async (req, res) => {
    try {
      const validatedData = generateVideoSchema.parse(req.body);
      const { 
        photoIds, 
        uploadedVideoId, 
        audioId, 
        backgroundMusicId, 
        backgroundMusicVolume, 
        projectId 
      } = validatedData;
      
      // Get the audio
      const audio = await storage.getAudio(audioId);
      if (!audio) {
        return res.status(404).json({ error: "Audio not found" });
      }
      
      // Verificar si estamos procesando fotos o un video subido
      let photos = [];
      let uploadedVideo = null;
      
      if (photoIds && photoIds.length > 0) {
        // Procesar con fotos
        photos = await Promise.all(
          photoIds.map(async (id) => await storage.getPhoto(parseInt(id)))
        );
        
        // Ensure all photos exist
        if (photos.includes(undefined)) {
          return res.status(404).json({ error: "One or more photos not found" });
        }
      } else if (uploadedVideoId) {
        // Procesar con video subido
        uploadedVideo = await storage.getUploadedVideo(uploadedVideoId);
        if (!uploadedVideo) {
          return res.status(404).json({ error: "Uploaded video not found" });
        }
      } else {
        return res.status(400).json({ error: "Either photos or an uploaded video must be provided" });
      }
      
      // Esta validación ya se hizo arriba cuando tenemos photoIds, así que la eliminamos
      
      // Get app settings for logo and text overlay
      const appSettings = await storage.getAppSettings();
      
      // Calculate duration for each photo if we're using photos
      const audioDuration = audio.duration || 0;
      let photoDuration = 0;
      if (photos.length > 0) {
        photoDuration = audioDuration / photos.length;
      }
      
      // Generate the output video filename
      const outputFilename = `video_${nanoid()}.mp4`;
      const outputPath = path.join(VIDEO_DIR, outputFilename);
      
      // Obtener la música de fondo si se especificó
      let backgroundMusic = null;
      if (backgroundMusicId) {
        backgroundMusic = await storage.getBackgroundMusicById(backgroundMusicId);
        if (!backgroundMusic) {
          console.warn(`Música de fondo con ID ${backgroundMusicId} no encontrada`);
        }
      }
      
      // Simplified approach without zoom effect
      // For multiple photos, create temporary directory for intermediate files
      const tempDir = path.join(process.cwd(), 'temp_video');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      // Create a text file for concatenation
      let concatContent = "";
      
      // Obtener el logo seleccionado de la base de datos de forma robusta
      let logoTempPath = '';
      let hasLogo = false;
      const logoPosition = appSettings?.logoPosition || "top-right";
      
      // Determinar coordenadas de posición para el logo según la posición seleccionada
      let logoX = '10';
      let logoY = '10';
      
      if (logoPosition === 'top-right') {
        logoX = 'W-w-10';
        logoY = '10';
      } else if (logoPosition === 'bottom-left') {
        logoX = '10';
        logoY = 'H-h-10';
      } else if (logoPosition === 'bottom-right') {
        logoX = 'W-w-10';
        logoY = 'H-h-10';
      }
      
      // Intenta obtener el logo seleccionado en la configuración
      if (appSettings?.selectedLogoId) {
        try {
          const selectedLogo = await storage.getLogo(appSettings.selectedLogoId);
          
          if (selectedLogo && selectedLogo.filepath && fs.existsSync(selectedLogo.filepath)) {
            // Crear una copia temporal del logo para procesamiento
            logoTempPath = path.join(tempDir, `logo_${nanoid()}.png`);
            fs.copyFileSync(selectedLogo.filepath, logoTempPath);
            
            // No necesitamos redimensionar el logo físicamente como archivo
            // Lo haremos en el comando FFmpeg al aplicarlo usando el parámetro de escala
            hasLogo = true;
            console.log(`Logo encontrado y aplicado: ${selectedLogo.name}`);
          } else {
            // Si el logo seleccionado no existe, intentar con el primer logo disponible
            console.log("Logo seleccionado no encontrado, buscando alternativas...");
            const logos = await storage.getLogos();
            if (logos && logos.length > 0) {
              const firstAvailableLogo = logos[0];
              if (firstAvailableLogo && firstAvailableLogo.filepath && fs.existsSync(firstAvailableLogo.filepath)) {
                // Actualizar la configuración con el logo disponible
                await storage.updateAppSettings({
                  selectedLogoId: firstAvailableLogo.id,
                  updatedAt: new Date().toISOString()
                });
                
                // Usar el logo disponible
                logoTempPath = path.join(tempDir, `logo_${nanoid()}.png`);
                fs.copyFileSync(firstAvailableLogo.filepath, logoTempPath);
                hasLogo = true;
                console.log(`Logo alternativo aplicado: ${firstAvailableLogo.name}`);
              }
            }
          }
        } catch (error) {
          console.error("Error preparando logo:", error);
          // Continuar sin logo si hay un error
        }
      } else {
        // Si no hay logo seleccionado en la configuración, intentar con el primer logo disponible
        try {
          const logos = await storage.getLogos();
          if (logos && logos.length > 0) {
            const firstLogo = logos[0];
            if (firstLogo && firstLogo.filepath && fs.existsSync(firstLogo.filepath)) {
              // Actualizar la configuración con el primer logo
              await storage.updateAppSettings({
                selectedLogoId: firstLogo.id,
                updatedAt: new Date().toISOString()
              });
              
              // Usar el primer logo
              logoTempPath = path.join(tempDir, `logo_${nanoid()}.png`);
              fs.copyFileSync(firstLogo.filepath, logoTempPath);
              hasLogo = true;
              console.log(`Primer logo disponible aplicado: ${firstLogo.name}`);
            }
          }
        } catch (error) {
          console.error("Error buscando logos alternativos:", error);
          // Continuar sin logo si hay un error
        }
      }
      
      // Prepare text overlay - FORZAR para que siempre aparezca
      let textOverlay = '';
      if (appSettings) {
        // Usar exactamente el texto que el usuario ha configurado
        let titleText = appSettings.titleText || "";
        
        // Procesar los saltos de línea marcados con [nl]
        // Reemplazar [nl] con saltos de línea reales para FFmpeg
        titleText = titleText.replace(/\[nl\]/g, '\\n');
        
        // Implementar saltos de línea automáticos para textos largos
        // Estimamos aproximadamente 30-35 caracteres por línea para un tamaño de fuente de 32px
        // en un video de 1280x720
        const maxCharsPerLine = 35;
        
        // Solo aplicar saltos de línea automáticos si no hay saltos de línea manuales
        if (!titleText.includes('\\n') && titleText.length > maxCharsPerLine) {
          let words = titleText.split(' ');
          let currentLine = '';
          let newText = '';
          
          // Iterar por cada palabra para distribuirlas en líneas
          for (let i = 0; i < words.length; i++) {
            let word = words[i];
            
            // Si agregar esta palabra excede el máximo de caracteres por línea,
            // iniciamos una nueva línea (excepto si es la primera palabra de la línea)
            if (currentLine.length + word.length > maxCharsPerLine && currentLine.length > 0) {
              newText += currentLine.trim() + '\\n';
              currentLine = word + ' ';
            } else {
              currentLine += word + ' ';
            }
          }
          
          // Agregamos la última línea
          newText += currentLine.trim();
          titleText = newText;
          
          console.log(`Texto con saltos de línea automáticos: "${titleText}"`);
        }
          
        const textColor = appSettings.titleColor || '#ffffff';
        const fontSize = appSettings.titleFontSize || 36; // Aumentar tamaño por defecto
        
        // Escapar comillas simples
        const text = titleText.replace(/'/g, "\\'"); // Escape single quotes
        
        // Título estilo moderno: caja redondeada con texto centrado como en la imagen
        // Usamos un estilo de texto tipo "pill" o pastilla con fondo rojo y esquinas redondeadas
        // Perfectamente centrado horizontal y verticalmente
        const textX = '(w-tw)/2'; // Centrado horizontal exacto
        const textY = 'h-th-150'; // Subimos la posición un 25% aproximadamente (desde 50px a 150px del borde inferior)
        
        // Estilo moderno: texto blanco sobre fondo rojo semi-transparente con esquinas redondeadas
        // Corregimos el formato del comando para evitar problemas con el parsing
        textOverlay = `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':fontcolor=white:fontsize=${fontSize}:x=${textX}:y=${textY}:box=1:boxcolor=red@0.9:boxborderw=20:shadowx=0:shadowy=0:line_spacing=10`;
        
        console.log(`Aplicando texto con saltos de línea: "${titleText}" con tamaño ${fontSize}px`);
      }

      if (photos.length === 1 && photos[0]) {
        // Para una sola foto, generamos video a partir de imagen estática con audio y overlays
        let command;
        
        if (hasLogo) {
          // Si hay logo, usamos filtergraph complejo para manejar 2 entradas visuales (foto + logo)
          // Ajustamos el logo a un máximo de 64px de alto manteniendo la proporción
          // Separamos el textOverlay en una variable diferente para mejorar la estructura del comando
          const drawTextFilter = textOverlay ? textOverlay.replace(/^,/, '') : '';
          command = `ffmpeg -loop 1 -t ${audioDuration} -i "${photos[0].filepath}" -i "${audio.filepath}" -i "${logoTempPath}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[base];[2:v]scale=-1:64[logo];[base][logo]overlay=${logoX}:${logoY}[vbase];[vbase]${drawTextFilter}[outv]" -map "[outv]" -map 1:a -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;
        } else {
          // Sin logo, solo aplicamos texto si es necesario
          // Usamos scale=increase para llenar completamente el marco y crop para mantener proporciones
          command = `ffmpeg -loop 1 -t ${audioDuration} -i "${photos[0].filepath}" -i "${audio.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720${textOverlay}" -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;
        }
        
        await exec(command);
      } else if (photos.length > 1) {
        // Para múltiples fotos, crear un slideshow con duración igual para cada foto
        
        // Procesar cada foto individualmente
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          if (photo && photo.filepath) {
            // Crear un segmento de imagen estática con overlays
            const tempOutput = path.join(tempDir, `temp_${i}.mp4`);
            let photoCommand;
            
            if (hasLogo) {
              // Si hay logo, usamos filtergraph complejo
              // Ajustamos el logo a un máximo de 64px de alto manteniendo la proporción
              const drawTextFilter = textOverlay ? textOverlay.replace(/^,/, '') : '';
              photoCommand = `ffmpeg -loop 1 -t ${photoDuration} -i "${photo.filepath}" -i "${logoTempPath}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[base];[1:v]scale=-1:64[logo];[base][logo]overlay=${logoX}:${logoY}[vbase];[vbase]${drawTextFilter}[outv]" -map "[outv]" -c:v libx264 -pix_fmt yuv420p "${tempOutput}"`;
            } else {
              // Sin logo, solo aplicamos texto si es necesario
              // Usamos scale=increase para llenar todo el marco
              photoCommand = `ffmpeg -loop 1 -t ${photoDuration} -i "${photo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720${textOverlay}" -c:v libx264 -pix_fmt yuv420p "${tempOutput}"`;
            }
            
            await exec(photoCommand);
            
            // Añadir al archivo de concatenación
            concatContent += `file '${tempOutput}'\n`;
          }
        }
        
        // Create concat list file
        const concatFilePath = path.join(tempDir, 'concat_list.txt');
        fs.writeFileSync(concatFilePath, concatContent);
        
        // Create output file without audio
        const tempVideoOutput = path.join(tempDir, 'temp_video_output.mp4');
        const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c:v libx264 -pix_fmt yuv420p "${tempVideoOutput}"`;
        await exec(concatCommand);
        
        // Add audio to the final video
        const finalCommand = `ffmpeg -i "${tempVideoOutput}" -i "${audio.filepath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
        await exec(finalCommand);
        
        // Clean up temp files
        setTimeout(() => {
          try {
            if (fs.existsSync(concatFilePath)) {
              fs.unlinkSync(concatFilePath);
            }
            if (fs.existsSync(tempVideoOutput)) {
              fs.unlinkSync(tempVideoOutput);
            }
            for (let i = 0; i < photos.length; i++) {
              const tempOutput = path.join(tempDir, `temp_${i}.mp4`);
              if (fs.existsSync(tempOutput)) {
                fs.unlinkSync(tempOutput);
              }
            }
            // Clean up logo temp file if it exists
            if (fs.existsSync(logoTempPath)) {
              fs.unlinkSync(logoTempPath);
            }
            // Try to remove temp directory
            if (fs.existsSync(tempDir)) {
              fs.rmdirSync(tempDir);
            }
          } catch (e) {
            console.warn("Error cleaning up temp files:", e);
          }
        }, 5000);
      } else if (uploadedVideo && uploadedVideo.filepath) {
        // Procesar usando un video subido
        console.log("Procesando con video subido:", uploadedVideo.filename);
        let command;
        
        // Necesitamos sincronizar el audio con el video, potencialmente recortando el video
        // o añadiendo bucles si es necesario
        const videoTempPath = path.join(tempDir, `temp_video_${nanoid()}.mp4`);
        
        // Primero procesamos el video para aplicar logo y texto
        if (hasLogo) {
          // Si hay logo, usamos filtergraph complejo
          // Ajustamos el logo a un máximo de 64px de alto manteniendo la proporción
          const drawTextFilter = textOverlay ? textOverlay.replace(/^,/, '') : '';
          const processVideoCommand = `ffmpeg -i "${uploadedVideo.filepath}" -i "${logoTempPath}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[base];[1:v]scale=-1:64[logo];[base][logo]overlay=${logoX}:${logoY}[vbase];[vbase]${drawTextFilter}[outv]" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -shortest "${videoTempPath}"`;
          await exec(processVideoCommand);
        } else {
          // Sin logo, solo aplicamos texto si es necesario
          // Si hay texto, necesitamos aplicarlo como un filtro drawtext separado
          if (textOverlay) {
            const drawTextFilter = textOverlay.replace(/^,/, '');
            const processVideoCommand = `ffmpeg -i "${uploadedVideo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,${drawTextFilter}" -c:v libx264 -pix_fmt yuv420p "${videoTempPath}"`;
            await exec(processVideoCommand);
          } else {
            const processVideoCommand = `ffmpeg -i "${uploadedVideo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -c:v libx264 -pix_fmt yuv420p "${videoTempPath}"`;
            await exec(processVideoCommand);
          }

          // No hay llamada adicional a processVideoCommand aquí
        }
        
        // Luego combinamos el video procesado con el audio
        if (backgroundMusic && backgroundMusic.filepath) {
          // Si hay música de fondo, mezclamos el audio principal con la música
          const musicVolume = backgroundMusicVolume || 0.2; // Valor por defecto
          
          // Crear un archivo temporal para la mezcla de audio
          const mixedAudioPath = path.join(tempDir, `mixed_audio_${nanoid()}.mp3`);
          
          // Mezclar el audio principal con la música de fondo
          const mixAudioCommand = `ffmpeg -i "${audio.filepath}" -i "${backgroundMusic.filepath}" -filter_complex "[0:a]volume=1.0[a1];[1:a]volume=${musicVolume}[a2];[a1][a2]amix=inputs=2:duration=longest[aout]" -map "[aout]" "${mixedAudioPath}"`;
          await exec(mixAudioCommand);
          
          // Combinar el video procesado con el audio mezclado
          command = `ffmpeg -i "${videoTempPath}" -i "${mixedAudioPath}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest "${outputPath}"`;
          await exec(command);
          
          // Limpiar el archivo de audio mezclado
          fs.unlinkSync(mixedAudioPath);
        } else {
          // Sin música de fondo, solo combinamos con el audio principal
          command = `ffmpeg -i "${videoTempPath}" -i "${audio.filepath}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest "${outputPath}"`;
          await exec(command);
        }
        
        // Limpiar el archivo de video temporal
        fs.unlinkSync(videoTempPath);
      } else {
        throw new Error("No valid photos or uploaded video provided");
      }
      
      // Save the video record
      const videoData = {
        filename: outputFilename,
        filepath: outputPath,
        duration: audio.duration,
        photoIds: photoIds,
        audioId,
        projectId,
        createdAt: new Date().toISOString()
      };
      
      const parsedData = insertVideoSchema.parse(videoData);
      const video = await storage.createVideo(parsedData);
      
      res.status(201).json(video);
    } catch (error) {
      console.error("Video generation error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to generate video" });
      }
    }
  });

  // Get video by project ID
  app.get("/api/projects/:id/video", async (req, res) => {
    try {
      const projectId = req.params.id;
      const video = await storage.getVideoByProjectId(projectId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found for this project" });
      }
      
      res.json(video);
    } catch (error) {
      res.status(500).json({ error: "Failed to get video" });
    }
  });

  // Stream video file
  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Stream the video file
      const stat = fs.statSync(video.filepath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(video.filepath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        
        fs.createReadStream(video.filepath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stream video" });
    }
  });

  // Download video file
  app.get("/api/videos/:id/download", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      res.download(video.filepath, video.filename);
    } catch (error) {
      res.status(500).json({ error: "Failed to download video" });
    }
  });
  
  // Get favorite voice (legacy)
  app.get("/api/preferences/favorite-voice", async (req, res) => {
    try {
      const preferences = await storage.getFavoriteVoice();
      
      if (!preferences) {
        return res.status(404).json({ error: "No favorite voice found" });
      }
      
      res.json({
        favoriteVoiceId: preferences.favoriteVoiceId,
        voiceName: preferences.voiceName
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get favorite voice" });
    }
  });
  
  // Save favorite voice (legacy)
  app.post("/api/preferences/favorite-voice", async (req, res) => {
    try {
      const { favoriteVoiceId, voiceName } = req.body;
      
      if (!favoriteVoiceId || !voiceName) {
        return res.status(400).json({ error: "Voice ID and name are required" });
      }
      
      const timestamp = new Date().toISOString();
      const preferences = await storage.getFavoriteVoice();
      
      let result;
      if (preferences) {
        // Update existing preference
        result = await storage.updateFavoriteVoice({
          favoriteVoiceId,
          voiceName,
          createdAt: preferences.createdAt,
          updatedAt: timestamp
        });
      } else {
        // Create new preference
        result = await storage.saveFavoriteVoice({
          favoriteVoiceId,
          voiceName,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }
      
      res.status(201).json({
        favoriteVoiceId: result.favoriteVoiceId,
        voiceName: result.voiceName
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to save favorite voice" });
    }
  });
  
  // Get all saved voices
  app.get("/api/saved-voices", async (req, res) => {
    try {
      const voices = await storage.getSavedVoices();
      res.json(voices);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved voices" });
    }
  });
  
  // Get saved voice by ID
  app.get("/api/saved-voices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const voice = await storage.getSavedVoice(id);
      
      if (!voice) {
        return res.status(404).json({ error: "Saved voice not found" });
      }
      
      res.json(voice);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved voice" });
    }
  });
  
  // Get saved voice by position (0, 1, 2)
  app.get("/api/saved-voices-by-position/:position", async (req, res) => {
    try {
      const position = parseInt(req.params.position);
      
      if (isNaN(position) || position < 0 || position > 2) {
        return res.status(400).json({ error: "Invalid position. Must be 0, 1, or 2" });
      }
      
      const voice = await storage.getSavedVoiceByPosition(position);
      
      if (!voice) {
        return res.status(404).json({ error: "No voice saved at this position" });
      }
      
      res.json(voice);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved voice" });
    }
  });
  
  // Get default saved voice
  app.get("/api/saved-voices-default", async (req, res) => {
    try {
      const voice = await storage.getDefaultSavedVoice();
      
      if (!voice) {
        return res.status(404).json({ error: "No default voice set" });
      }
      
      res.json(voice);
    } catch (error) {
      res.status(500).json({ error: "Failed to get default voice" });
    }
  });
  
  // Save a voice
  app.post("/api/saved-voices", async (req, res) => {
    try {
      const { voiceId, voiceName, displayName, position, isDefault } = req.body;
      
      if (!voiceId || !voiceName) {
        return res.status(400).json({ error: "Voice ID and name are required" });
      }
      
      const timestamp = new Date().toISOString();
      
      const savedVoice = await storage.saveSavedVoice({
        voiceId,
        voiceName,
        displayName: displayName || voiceName,
        position: position !== undefined ? position : 0,
        isDefault: isDefault !== undefined ? isDefault : false,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      
      res.status(201).json(savedVoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to save voice" });
    }
  });
  
  // Update a saved voice
  app.patch("/api/saved-voices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { displayName, position, isDefault } = req.body;
      
      const updatedVoice = await storage.updateSavedVoice(id, {
        displayName,
        position,
        isDefault,
        updatedAt: new Date().toISOString()
      });
      
      res.json(updatedVoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update saved voice" });
    }
  });
  
  // Delete a saved voice
  app.delete("/api/saved-voices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSavedVoice(id);
      
      if (!result) {
        return res.status(404).json({ error: "Voice not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved voice" });
    }
  });
  
  // Get app settings
  app.get("/api/app-settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      
      if (!settings) {
        // Si no hay configuración, inicializarla con valores predeterminados
        const timestamp = new Date().toISOString();
        const newSettings = await storage.saveAppSettings({
          selectedLogoId: 1,
          logoPosition: "top-right",
          showTitle: true,
          titleText: "",
          titleFontSize: 32,
          titleColor: "#ffffff",
          titlePosition: "top-center",
          createdAt: timestamp,
          updatedAt: timestamp
        });
        
        return res.json(newSettings);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get app settings" });
    }
  });
  
  // Update app settings
  app.patch("/api/app-settings", async (req, res) => {
    try {
      const { 
        selectedLogoId, 
        logoPosition, 
        showTitle,
        titleText, 
        titleFontSize, 
        titleColor, 
        titlePosition 
      } = req.body;
      
      const updatedSettings = await storage.updateAppSettings({
        selectedLogoId,
        logoPosition,
        showTitle,
        titleText,
        titleFontSize,
        titleColor,
        titlePosition,
        updatedAt: new Date().toISOString()
      });
      
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update app settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
