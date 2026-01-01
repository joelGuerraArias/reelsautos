import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
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

// Función para obtener la ruta de una fuente según el sistema operativo
function getFontPath(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows - usar Arial Bold
    return 'C:/Windows/Fonts/arialbd.ttf';
  } else if (platform === 'darwin') {
    // macOS - usar Helvetica Bold
    return '/System/Library/Fonts/Helvetica-Bold.ttc';
  } else {
    // Linux - usar DejaVu Sans Bold
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  }
}

// Función mejorada para ejecutar FFmpeg con timeout y logging
async function execFFmpeg(command: string, description: string, timeoutMs: number = 600000) {
  logger.info('FFMPEG', `⏳ Iniciando: ${description}`, { timeout: `${timeoutMs / 1000}s` });
  console.log(`\n🎬 [FFmpeg] ${description}`);
  console.log(`⏱️  Timeout: ${timeoutMs / 1000}s`);
  console.log(`📝 Comando: ${command.substring(0, 200)}...`);

  const startTime = Date.now();

  try {
    const result = await exec(command, {
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer (aumentado)
      timeout: timeoutMs
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success('FFMPEG', `✅ ${description} completado`, { duration: `${duration}s` });
    console.log(`✅ [FFmpeg] ${description} completado en ${duration}s`);

    if (result.stderr) {
      console.log(`⚠️  FFmpeg stderr: ${result.stderr.substring(0, 200)}`);
    }

    return result;
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const isTimeout = error.killed || error.message.includes('ETIMEDOUT');

    logger.error('FFMPEG', `❌ Error en ${description}`, {
      duration: `${duration}s`,
      isTimeout,
      error: error.message.substring(0, 200)
    });

    console.error(`❌ [FFmpeg] Error en ${description} después de ${duration}s`);
    console.error(`Error: ${error.message}`);
    if (error.stderr) {
      console.error(`FFmpeg stderr: ${error.stderr.substring(0, 500)}`);
    }
    if (error.stdout) {
      console.error(`FFmpeg stdout: ${error.stdout.substring(0, 500)}`);
    }
    throw error;
  }
}

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
    // Accept common image formats including WEBP
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp'
    ];

    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen (JPEG, PNG, WEBP, GIF, BMP)"));
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
      console.log("Fetching voices, API Key present:", !!apiKey);

      if (!apiKey) {
        console.error("Eleven Labs API key is missing");
        return res.status(500).json({ error: "Eleven Labs API key not configured" });
      }

      const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        }
      });

      console.log("Voices fetched successfully, count:", response.data.voices?.length);
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
      console.log("Creating project with data:", req.body);

      const projectData = {
        id: req.body.id || nanoid(),
        title: req.body.title || "Proyecto sin título",
        description: req.body.description || null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        selectedVoiceId: null,
        selectedLogoId: null,
        logoPosition: null,
        showTitle: null,
        titleText: null,
        titleFontSize: null,
        titleColor: null,
        titlePosition: null,
        backgroundMusicId: null,
        backgroundMusicVolume: null,
        useUploadedVideo: null,
        isTemplate: false
      };

      console.log("Processed project data:", projectData);
      const project = await storage.createProject(projectData);
      console.log("Project created successfully:", project);

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
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

  // Update project by ID
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Campos que se pueden actualizar
      const updatable = [
        'title', 'description', 'selectedVoiceId', 'selectedLogoId', 'logoPosition',
        'showTitle', 'titleText', 'titleFontSize', 'titleColor', 'titlePosition',
        'backgroundMusicId', 'backgroundMusicVolume', 'useUploadedVideo',
        'isTemplate'
      ];

      // Construir objeto con sólo los campos permitidos
      const updates: any = {};
      for (const field of updatable) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Realizar la actualización
      const updatedProject = {
        ...project,
        ...updates
      };

      // Utilizamos el método updateProject de la clase DatabaseStorage
      await storage.updateProject(projectId, updates);

      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Obtener la plantilla más reciente (último proyecto con isTemplate=true)
  app.get("/api/templates/latest", async (req, res) => {
    try {
      // Utilizamos el método getLatestTemplate de DatabaseStorage
      const latestTemplate = await storage.getLatestTemplate();

      if (latestTemplate) {
        return res.json(latestTemplate);
      }

      // Si no hay plantillas, devolver un 404
      return res.status(404).json({ error: "No templates found" });
    } catch (error) {
      console.error("Error getting latest template:", error);
      res.status(500).json({ error: "Failed to get latest template" });
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
        logger.warn('PHOTO', 'Intento de upload sin archivo');
        return res.status(400).json({ error: "No file uploaded" });
      }

      logger.info('PHOTO', '📷 Subiendo foto', {
        filename: req.file.originalname,
        size: (req.file.size / 1024).toFixed(2) + ' KB'
      });

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

      logger.success('PHOTO', '✅ Foto subida', { photoId: photo.id, filename: photo.filename });
      res.status(201).json(photo);
    } catch (error) {
      // Clean up the file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('PHOTO', 'Error al subir foto', { error: errorMessage });

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

  // Stream photo file
  app.get("/api/photos/:id/stream", async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const photo = await storage.getPhoto(photoId);

      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Set cache control headers to prevent caching issues
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Stream the photo file
      res.sendFile(photo.filepath);
    } catch (error) {
      console.error("Error al servir la foto:", error);
      res.status(500).json({ error: "Failed to stream photo" });
    }
  });

  // Generate audio from text using Eleven Labs API
  app.post("/api/audios", async (req, res) => {
    logger.info('AUDIO', '🎤 Iniciando generación de audio');

    try {
      const validatedData = generateAudioSchema.parse(req.body);
      const { text, voice, projectId } = validatedData;

      logger.info('AUDIO', 'Datos validados', { voiceId: voice, textLength: text.length });

      // Call Eleven Labs API to generate audio
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        logger.error('AUDIO', 'API Key de ElevenLabs no configurada');
        return res.status(500).json({ error: "Eleven Labs API key not configured" });
      }

      logger.info('AUDIO', 'Llamando a ElevenLabs API...');
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
      logger.success('AUDIO', 'Respuesta de ElevenLabs recibida');

      // Save the audio file
      const filename = `audio_${nanoid()}.mp3`;
      const filepath = path.join(AUDIO_DIR, filename);

      fs.writeFileSync(filepath, response.data);
      logger.info('AUDIO', 'Archivo de audio guardado', { filename });

      // Get audio duration using FFmpeg
      const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`);
      const duration = Math.round(parseFloat(stdout.trim()));
      logger.info('AUDIO', 'Duración calculada', { duration: duration + 's' });

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

      logger.success('AUDIO', '✅ Audio generado exitosamente', { audioId: audio.id, duration: duration + 's' });
      res.status(201).json(audio);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('AUDIO', 'Error en generación de audio', { error: errorMessage });

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
      console.log("Logo upload attempt started");
      console.log("Request file:", req.file);
      console.log("Request body:", req.body);

      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const logoData = {
        name: req.body.name || req.file.originalname,
        filename: req.file.originalname,
        filepath: req.file.path,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log("Logo data prepared:", logoData);

      const parsedData = insertLogoSchema.parse(logoData);
      console.log("Schema validation passed");

      const logo = await storage.createLogo(parsedData);
      console.log("Logo created successfully:", logo);

      res.status(201).json(logo);
    } catch (error) {
      console.error("Logo upload error:", error);

      // Limpiar el archivo en caso de error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }

      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Validation error:", validationError.message);
        res.status(400).json({ error: validationError.message });
      } else {
        const err = error as Error;
        console.error("General error:", err.message);
        res.status(500).json({ error: err.message || "Failed to upload logo" });
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

  // Get all videos
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      logger.error('VIDEO', 'Error al obtener videos', { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get videos" });
    }
  });

  // Generate video from photos and audio
  app.post("/api/videos", async (req, res) => {
    const startTime = Date.now();
    logger.info('VIDEO', '🎬 Iniciando generación de video', { projectId: req.body.projectId });

    try {
      const validatedData = generateVideoSchema.parse(req.body);
      const {
        photoIds,
        uploadedVideoId,
        uploadedVideoIds,
        audioId,
        backgroundMusicId,
        backgroundMusicVolume,
        projectId
      } = validatedData;

      logger.info('VIDEO', 'Datos validados', {
        photoCount: photoIds?.length || 0,
        audioId,
        hasBackgroundMusic: !!backgroundMusicId
      });

      // Get the audio
      const audio = await storage.getAudio(audioId);
      if (!audio) {
        logger.error('VIDEO', 'Audio no encontrado', { audioId });
        return res.status(404).json({ error: "Audio not found" });
      }
      logger.success('VIDEO', 'Audio cargado', { duration: audio.duration });

      // Verificar si estamos procesando fotos o videos subidos
      let photos: any[] = [];
      let uploadedVideo: any = null;
      let uploadedVideos: any[] = [];

      if (photoIds && photoIds.length > 0) {
        // Procesar con fotos
        photos = await Promise.all(
          photoIds.map(async (id) => await storage.getPhoto(parseInt(id)))
        );

        // Ensure all photos exist
        if (photos.includes(undefined)) {
          return res.status(404).json({ error: "One or more photos not found" });
        }
      } else if (uploadedVideoIds && uploadedVideoIds.length > 0) {
        // Procesar con múltiples videos subidos
        uploadedVideos = await Promise.all(
          uploadedVideoIds.map(async (id) => await storage.getUploadedVideo(id))
        );

        // Verificar que todos los videos existan
        if (uploadedVideos.includes(undefined) || uploadedVideos.some(v => v === null)) {
          return res.status(404).json({ error: "One or more videos not found" });
        }
      } else if (uploadedVideoId) {
        // Procesar con un solo video subido (para compatibilidad)
        uploadedVideo = await storage.getUploadedVideo(uploadedVideoId);
        if (!uploadedVideo) {
          return res.status(404).json({ error: "Uploaded video not found" });
        }
        // Convertir a array para procesamiento uniforme
        uploadedVideos = [uploadedVideo];
      } else {
        return res.status(400).json({ error: "Either photos or uploaded videos must be provided" });
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

      // Obtener la música de fondo - si se especificó usamos esa, si no, buscamos una automáticamente
      let backgroundMusic = null;
      // Variable para el volumen de la música de fondo, por defecto 0.6 (60%)
      // Aumentamos a 60% para asegurar que la música se escuche correctamente
      // Usamos una variable diferente para evitar conflictos con backgroundMusicVolume de validatedData
      let musicVolumeToUse = 0.6;

      if (backgroundMusicId) {
        // Si el usuario especificó una música, intentamos obtenerla
        try {
          backgroundMusic = await storage.getBackgroundMusicById(backgroundMusicId);

          // Verificar que el archivo de música existe
          if (backgroundMusic && backgroundMusic.filepath) {
            if (!fs.existsSync(backgroundMusic.filepath)) {
              console.log(`El archivo de música de fondo no existe en la ruta: ${backgroundMusic.filepath}`);
              console.warn(`⚠️  Música de fondo no encontrada, continuando sin música de fondo`);
              backgroundMusic = null;
            } else if (validatedData.backgroundMusicVolume) {
              // Si el usuario especificó un volumen, lo utilizamos
              const volumeValue = typeof validatedData.backgroundMusicVolume === 'string' ?
                parseFloat(validatedData.backgroundMusicVolume) :
                Number(validatedData.backgroundMusicVolume);
              musicVolumeToUse = isNaN(volumeValue) ? 0.6 : volumeValue;
            }
          } else {
            console.warn(`Música de fondo con ID ${backgroundMusicId} no encontrada o ruta no válida`);
            backgroundMusic = null;
          }
        } catch (error) {
          console.error(`Error al obtener música de fondo con ID ${backgroundMusicId}:`, error);
          backgroundMusic = null; // En caso de error, continuamos sin música de fondo
        }
      } else {
        // Si no hay música de fondo especificada, NO buscar automáticamente
        // Solo usar música si el usuario la especifica explícitamente
        console.log("No se especificó música de fondo, continuando sin ella");
        backgroundMusic = null;
      }

      // Simplified approach without zoom effect
      // For multiple photos, create temporary directory for intermediate files
      const tempDir = path.join(process.cwd(), 'temp_video');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // Create a text file for concatenation
      let concatContent = "";

      // PRIORIDAD: Usar configuraciones del proyecto si existen, sino usar appSettings global
      const project = await storage.getProject(validatedData.projectId);
      const settingsToUse = (project?.titleText || project?.showTitle !== null) ? project : appSettings;
      console.log(`📋 Usando configuraciones de: ${settingsToUse === project ? 'Proyecto' : 'Global (appSettings)'}`);
      console.log(`📋 Configuración completa:`, JSON.stringify({
        showTitle: settingsToUse?.showTitle,
        titleText: settingsToUse?.titleText,
        titleFontSize: settingsToUse?.titleFontSize,
        titleColor: settingsToUse?.titleColor,
        titlePosition: settingsToUse?.titlePosition,
        selectedLogoId: settingsToUse?.selectedLogoId,
        logoPosition: settingsToUse?.logoPosition
      }, null, 2));

      // Obtener el logo seleccionado de la base de datos de forma robusta
      let logoTempPath = '';
      let hasLogo = false;
      // Usar configuración del proyecto si existe, sino usar appSettings
      const logoPosition = settingsToUse?.logoPosition || "top-right";

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
      if (settingsToUse?.selectedLogoId) {
        try {
          const selectedLogo = await storage.getLogo(settingsToUse.selectedLogoId);

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

      // Prepare text overlay - MÉTODO SIMPLIFICADO (basado en webtohook2.py)
      let textOverlay = '';

      if (settingsToUse) {
        // Usar exactamente el texto que el usuario ha configurado
        let titleText = (settingsToUse.titleText || "").trim().replace(/\r/g, '');

        // Añadir debug para ver qué texto está llegando
        console.log("📝 Texto del título original:", JSON.stringify(titleText));
        console.log("📝 showTitle value:", settingsToUse.showTitle);
        console.log("📝 showTitle type:", typeof settingsToUse.showTitle);

        // Verificar si el showTitle está activado
        // Si showTitle es null o undefined, por defecto es true
        // Si showTitle es false explícitamente, no mostrar título
        const showTitle = settingsToUse.showTitle === null || settingsToUse.showTitle === undefined ? true : settingsToUse.showTitle;
        console.log("📝 showTitle computed:", showTitle);

        if (!showTitle || !titleText.trim()) {
          console.log(`❌ El título NO se mostrará - showTitle: ${showTitle}, titleText: "${titleText}"`);
          textOverlay = ""; // No mostrar texto
        } else {
          console.log(`✅ El título SÍ se mostrará - showTitle: ${showTitle}, titleText: "${titleText}"`);
          // Procesar los saltos de línea del textarea (caracteres \n) 
          // y los marcados con [nl] a formato FFmpeg (\n)
          titleText = titleText.replace(/\n/g, '\\n').replace(/\[nl\]/g, '\\n');
          console.log("Texto después de procesar saltos de línea:", JSON.stringify(titleText));

          // Verificar la longitud del texto para ajustar el tamaño de la fuente
          const textLength = titleText.replace(/\\n/g, '').length;
          console.log(`Longitud del texto: ${textLength} caracteres`);

          // Ajustar tamaño de fuente según la longitud del texto
          let fontSize = 28; // Tamaño base más grande para mejor visibilidad
          if (textLength > 50) {
            fontSize = 24;
          }
          if (textLength > 70) {
            fontSize = 22;
          }

          // Dividir el texto en DOS líneas si es largo y no tiene saltos de línea
          if (textLength > 40 && !titleText.includes('\\n')) {
            const mitad = Math.ceil(titleText.length / 2);
            let primeraMitad = titleText.substring(0, mitad);
            let segundaMitad = titleText.substring(mitad);

            const ultimoEspacio = primeraMitad.lastIndexOf(" ");
            if (ultimoEspacio > 0) {
              segundaMitad = primeraMitad.substring(ultimoEspacio + 1) + segundaMitad;
              primeraMitad = primeraMitad.substring(0, ultimoEspacio);
            }

            titleText = `${primeraMitad}\\n${segundaMitad}`;
            console.log("Texto dividido en dos líneas:", titleText);
          }

          // Ya no necesitamos archivo temporal - usamos texto directo en el comando
          console.log(`✅ Usando texto directo en el comando FFmpeg (sin archivo temporal)`);

          // MÉTODO SIMPLIFICADO basado en webtohook2.py que funciona
          // Escapar caracteres especiales en el texto para FFmpeg
          let escapedText = titleText
            .replace(/'/g, "'\\''")  // Escapar comillas simples
            .replace(/:/g, '\\:')    // Escapar dos puntos
            .replace(/\\/g, '\\\\'); // Escapar backslashes

          console.log(`📝 Texto escapado: ${escapedText}`);
          console.log(`📝 Tamaño de fuente: ${fontSize}px`);

          // Usar el método simple de webtohook2.py pero con fuente específica
          const fontPath = getFontPath().replace(/:/g, '\\:');
          // Posición: centrado horizontal, cerca del borde inferior
          textOverlay = `,drawtext=fontfile='${fontPath}':text='${escapedText}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-(text_h*1.2)-60`;

          console.log(`✅ Aplicando título al video (método simplificado)`);
          console.log(`📝 Comando drawtext: ${textOverlay}`);
        }
      }

      if (photos.length === 1 && photos[0]) {
        // Para una sola foto, generamos video a partir de imagen estática con audio y overlays
        let command;

        console.log(`\n📋 Generando video con 1 foto:`);
        console.log(`   - Tiene logo: ${hasLogo}`);
        console.log(`   - Tiene texto: ${textOverlay.length > 0}`);
        console.log(`   - Longitud textOverlay: ${textOverlay.length}`);
        console.log(`   - Duración: ${audioDuration}s`);
        if (textOverlay.length > 0) {
          console.log(`   - Preview textOverlay: ${textOverlay.substring(0, 200)}...`);
        }

        if (hasLogo) {
          // Si hay logo, usamos filtergraph complejo para manejar 2 entradas visuales (foto + logo)
          // Ajustamos el logo a un máximo de 64px de alto manteniendo la proporción
          // Separamos el textOverlay en una variable diferente para mejorar la estructura del comando
          const drawTextFilter = textOverlay ? textOverlay.replace(/^,/, '') : '';
          console.log(`   - Filter text: ${drawTextFilter.substring(0, 200)}...`);
          console.log(`   - Filter text COMPLETO: ${drawTextFilter}`);
          // Agregamos optimizaciones de rendimiento: preset ultrafast, threads
          command = `ffmpeg -y -loop 1 -t ${audioDuration} -i "${photos[0].filepath}" -i "${audio.filepath}" -i "${logoTempPath}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1[base];[2:v]scale=-1:64,setsar=1:1[logo];[base][logo]overlay=${logoX}:${logoY}[vbase];[vbase]${drawTextFilter}[outv]" -map "[outv]" -map 1:a -c:v libx264 -preset ultrafast -threads 0 -c:a aac -b:a 192k -pix_fmt yuv420p -r 30 -shortest "${outputPath}"`;
          console.log(`🎬 Comando FFmpeg COMPLETO (con logo y texto): ${command}`);
        } else {
          // Sin logo, solo aplicamos texto si es necesario
          // Usamos scale=increase para llenar completamente el marco y crop para mantener proporciones
          console.log(`   - Filter text (sin logo): ${textOverlay.substring(0, 200)}...`);
          console.log(`   - Filter text (sin logo) COMPLETO: ${textOverlay}`);
          command = `ffmpeg -y -loop 1 -t ${audioDuration} -i "${photos[0].filepath}" -i "${audio.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1${textOverlay}" -c:v libx264 -preset ultrafast -threads 0 -c:a aac -b:a 192k -pix_fmt yuv420p -r 30 -shortest "${outputPath}"`;
          console.log(`🎬 Comando FFmpeg COMPLETO (sin logo): ${command}`);
        }

        console.log("Generando video con una sola foto (modo optimizado)");
        await execFFmpeg(command, "Generar video con 1 foto", 900000); // 15 minutos
      } else if (photos.length > 1) {
        // MÉTODO RÁPIDO: Procesar cada foto por separado y concatenar
        // Este método es mucho más rápido que usar filter_complex con múltiples inputs
        logger.info('VIDEO', `🚀 Generando video con ${photos.length} fotos (método rápido)`);

        // VERIFICAR que todos los archivos existen
        const missingFiles: string[] = [];
        for (const photo of photos) {
          if (!fs.existsSync(photo.filepath)) {
            missingFiles.push(`Foto: ${photo.filepath}`);
          }
        }
        if (!fs.existsSync(audio.filepath)) {
          missingFiles.push(`Audio: ${audio.filepath}`);
        }
        if (hasLogo && !fs.existsSync(logoTempPath)) {
          missingFiles.push(`Logo: ${logoTempPath}`);
        }

        if (missingFiles.length > 0) {
          logger.error('VIDEO', 'Archivos faltantes', { missingFiles });
          throw new Error(`Archivos no encontrados: ${missingFiles.join(', ')}`);
        }

        // PASO 1: Procesar cada foto individualmente (muy rápido: ~0.3s por foto)
        const concatContent = [];
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          if (photo && photo.filepath) {
            const tempOutput = path.join(tempDir, `temp_${i}.mp4`);
            const basicCommand = `ffmpeg -y -loop 1 -t ${photoDuration} -i "${photo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1" -c:v libx264 -preset ultrafast -threads 0 -pix_fmt yuv420p -r 30 "${tempOutput}"`;
            await execFFmpeg(basicCommand, `Foto ${i + 1}/${photos.length}`, 30000); // 30 segundos max
            concatContent.push(tempOutput);
          }
        }

        if (concatContent.length === 0) {
          throw new Error("No se pudo procesar ninguna foto");
        }

        // PASO 2: Concatenar videos (muy rápido: ~0.3s)
        const concatFilePath = path.join(tempDir, 'concat_list.txt');
        const concatListContent = concatContent.map(file => `file '${file}'`).join('\n');
        fs.writeFileSync(concatFilePath, concatListContent);

        const tempVideoOutput = path.join(tempDir, 'temp_video_output.mp4');
        const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c:v copy "${tempVideoOutput}"`;
        await execFFmpeg(concatCommand, "Concatenar", 30000);

        // PASO 3: Combinar con audio (muy rápido: ~0.3s)
        const tempWithAudio = path.join(tempDir, 'temp_with_audio.mp4');
        const audioCommand = `ffmpeg -y -i "${tempVideoOutput}" -i "${audio.filepath}" -c:v copy -c:a aac -b:a 192k -shortest "${tempWithAudio}"`;
        await execFFmpeg(audioCommand, "Añadir audio", 30000);

        // PASO 4: Agregar logo y/o título si existen
        let currentVideo = tempWithAudio;

        if (hasLogo) {
          const tempWithLogo = path.join(tempDir, 'temp_with_logo.mp4');
          const logoCommand = `ffmpeg -y -i "${currentVideo}" -i "${logoTempPath}" -filter_complex "[1:v]scale=-1:64[logo];[0:v][logo]overlay=${logoX}:${logoY}" -c:v libx264 -preset ultrafast -c:a copy "${tempWithLogo}"`;
          await execFFmpeg(logoCommand, "Añadir logo", 60000);
          if (fs.existsSync(currentVideo) && currentVideo !== tempWithAudio) fs.unlinkSync(currentVideo);
          currentVideo = tempWithLogo;
        }

        if (textOverlay) {
          const drawTextFilter = textOverlay.replace(/^,/, '');
          const titleCommand = `ffmpeg -y -i "${currentVideo}" -vf "${drawTextFilter}" -c:v libx264 -preset ultrafast -c:a copy "${outputPath}"`;
          await execFFmpeg(titleCommand, "Añadir título", 60000);
          logger.success('VIDEO', 'Título agregado');
        } else {
          // Sin título, copiar el video final
          fs.copyFileSync(currentVideo, outputPath);
        }

        // Limpiar archivos temporales
        for (const tempFile of concatContent) {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
        if (fs.existsSync(tempVideoOutput)) fs.unlinkSync(tempVideoOutput);
        if (fs.existsSync(tempWithAudio)) fs.unlinkSync(tempWithAudio);
        if (currentVideo !== tempWithAudio && fs.existsSync(currentVideo)) fs.unlinkSync(currentVideo);

        logger.success('VIDEO', 'Video generado con método rápido');

        // Clean up temp files AFTER video generation completes
        // NO usar setTimeout aquí - limpiar después de que FFmpeg termine
        try {
          // Clean up logo temp file if it exists
          if (hasLogo && fs.existsSync(logoTempPath)) {
            fs.unlinkSync(logoTempPath);
          }
          // Try to remove temp directory if it's empty
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            if (files.length === 0) {
              fs.rmdirSync(tempDir);
            }
          }
        } catch (e) {
          console.warn("Error cleaning up temp files:", e);
        }
      } else if (uploadedVideos.length > 0) {
        // Procesar usando videos subidos (uno o múltiples)
        console.log(`Procesando con ${uploadedVideos.length} videos subidos`);

        // Array para almacenar las rutas de los videos procesados
        const processedVideos = [];

        // Procesar cada video subido
        for (let i = 0; i < uploadedVideos.length; i++) {
          const currentVideo = uploadedVideos[i];
          if (!currentVideo || !currentVideo.filepath) continue;

          console.log(`Procesando video ${i + 1}/${uploadedVideos.length}: ${currentVideo.filename}`);

          // Ruta temporal para este video procesado
          const videoTempPath = path.join(tempDir, `temp_video_${i}_${nanoid()}.mp4`);

          // Procesar el video para aplicar logo y texto
          // Usar parámetros consistentes para todos los videos: mismo SAR, framerate, etc.
          if (hasLogo) {
            // Si hay logo, usamos filtergraph complejo
            // Ajustamos el logo a un máximo de 64px de alto manteniendo la proporción
            const drawTextFilter = textOverlay ? textOverlay.replace(/^,/, '') : '';
            // Usar comillas dobles para escapar el texto dentro del comando FFmpeg
            // Añadimos flags para asegurar compatibilidad entre videos
            const processVideoCommand = `ffmpeg -y -i "${currentVideo.filepath}" -i "${logoTempPath}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1[base];[1:v]scale=-1:64,setsar=1:1[logo];[base][logo]overlay=${logoX}:${logoY}[vbase];[vbase]${drawTextFilter}[outv]" -map "[outv]" -c:v libx264 -preset ultrafast -threads 0 -pix_fmt yuv420p -r 30 -vsync cfr "${videoTempPath}"`;
            await execFFmpeg(processVideoCommand, `Procesar video ${i + 1} con logo y texto`, 600000); // 10 minutos
          } else {
            // Sin logo, solo aplicamos texto si es necesario
            if (textOverlay) {
              const drawTextFilter = textOverlay.replace(/^,/, '');
              const processVideoCommand = `ffmpeg -y -i "${currentVideo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1,${drawTextFilter}" -c:v libx264 -preset ultrafast -threads 0 -pix_fmt yuv420p -r 30 -vsync cfr "${videoTempPath}"`;
              await execFFmpeg(processVideoCommand, `Procesar video ${i + 1} con texto`, 600000); // 10 minutos
            } else {
              const processVideoCommand = `ffmpeg -y -i "${currentVideo.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1:1" -c:v libx264 -preset ultrafast -threads 0 -pix_fmt yuv420p -r 30 -vsync cfr "${videoTempPath}"`;
              await execFFmpeg(processVideoCommand, `Escalar video ${i + 1}`, 600000); // 10 minutos
            }
          }

          // Añadir el video procesado a la lista
          processedVideos.push(videoTempPath);
        }

        // Si no se procesó ningún video correctamente, lanzar error
        if (processedVideos.length === 0) {
          throw new Error("No se pudo procesar ningún video");
        }

        // Si solo hay un video procesado
        if (processedVideos.length === 1) {
          // Combinar el único video procesado con el audio
          if (backgroundMusic && backgroundMusic.filepath && fs.existsSync(backgroundMusic.filepath)) {
            // Si hay música de fondo y el archivo existe, mezclamos el audio principal con la música
            // Variable backgroundMusicVolume ya está inicializada con el valor (0.2 por defecto)

            // Crear un archivo temporal para la mezcla de audio
            const mixedAudioPath = path.join(tempDir, `mixed_audio_${nanoid()}.mp3`);

            console.log(`Mezclando audio principal con música de fondo: ${backgroundMusic.filepath}, volumen: ${musicVolumeToUse * 100}%`);
            // Mezclar el audio principal con la música de fondo
            // Aumentamos el volumen de la música y añadimos parámetros para mezclado más prioritario
            const mixAudioCommand = `ffmpeg -y -i "${audio.filepath}" -i "${backgroundMusic.filepath}" -filter_complex "[0:a]volume=0.8[a1];[1:a]volume=${musicVolumeToUse}[a2];[a1][a2]amix=inputs=2:duration=longest:weights=3 1[aout]" -map "[aout]" "${mixedAudioPath}"`;
            try {
              await execFFmpeg(mixAudioCommand, "Mezclar audio con música de fondo", 120000); // 2 minutos

              // Combinar el video procesado con el audio mezclado
              // Usamos el parámetro -t para asegurar que la duración del video coincida con la duración del audio
              // y quitamos -shortest para evitar que se corte el audio prematuramente
              const audioDuration = audio.duration || 0;
              console.log(`Ajustando la duración del video para que coincida con el audio: ${audioDuration} segundos`);

              // Si el video es más corto que el audio, lo extendemos con loop
              const command = `ffmpeg -y -stream_loop -1 -i "${processedVideos[0]}" -i "${mixedAudioPath}" -map 0:v -map 1:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;
              await execFFmpeg(command, "Combinar video con audio mezclado", 180000); // 3 minutos

              // Limpiar el archivo de audio mezclado
              if (fs.existsSync(mixedAudioPath)) {
                fs.unlinkSync(mixedAudioPath);
              }
            } catch (error) {
              console.error("Error al mezclar audio con música de fondo:", error);
              // Si hay error con la música de fondo, usar solo el audio principal
              console.log("Usando solo audio principal debido a error con música de fondo");
              const audioDuration = audio.duration || 0;
              // Si el video es más corto que el audio, lo extendemos con loop
              const command = `ffmpeg -y -stream_loop -1 -i "${processedVideos[0]}" -i "${audio.filepath}" -map 0:v -map 1:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;
              await execFFmpeg(command, "Combinar video con audio (fallback)", 180000); // 3 minutos
            }
          } else {
            // Sin música de fondo, solo combinamos con el audio principal
            // Usamos el parámetro -t para asegurar que la duración del video coincida con la duración del audio
            const audioDuration = audio.duration || 0;
            console.log(`Ajustando la duración del video para que coincida con el audio (sin música de fondo): ${audioDuration} segundos`);

            // Si el video es más corto que el audio, lo extendemos con loop
            const command = `ffmpeg -y -stream_loop -1 -i "${processedVideos[0]}" -i "${audio.filepath}" -map 0:v -map 1:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;
            await execFFmpeg(command, "Combinar video con audio", 180000); // 3 minutos
          }
        } else {
          // Si hay múltiples videos, concatenarlos primero
          console.log(`Concatenando ${processedVideos.length} videos...`);

          // Crear archivo de lista para concatenación
          const concatFilePath = path.join(tempDir, `concat_list_${nanoid()}.txt`);
          const concatFileContent = processedVideos.map(video => `file '${video.replace(/'/g, "'\\''")}'\n`).join('');
          fs.writeFileSync(concatFilePath, concatFileContent);

          // Concatenar videos - en lugar de usar copy, recodificamos para asegurar compatibilidad
          const concatOutputPath = path.join(tempDir, `concat_output_${nanoid()}.mp4`);
          const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -r 30 -vsync 1 -strict -2 "${concatOutputPath}"`;
          await execFFmpeg(concatCommand, "Concatenar múltiples videos", 600000); // 10 minutos

          // Ahora combinar el video concatenado con el audio
          if (backgroundMusic && backgroundMusic.filepath && fs.existsSync(backgroundMusic.filepath)) {
            // Si hay música de fondo y el archivo existe, mezclamos el audio principal con la música
            // Usamos musicVolumeToUse que ya está inicializado con 0.2 (20%)

            // Crear un archivo temporal para la mezcla de audio
            const mixedAudioPath = path.join(tempDir, `mixed_audio_${nanoid()}.mp3`);

            console.log(`Mezclando audio principal con música de fondo para videos múltiples: ${backgroundMusic.filepath}, volumen: ${musicVolumeToUse * 100}%`);
            // Mezclar el audio principal con la música de fondo
            // Aumentamos el volumen de la música y ajustamos la mezcla para mejor balance
            const mixAudioCommand = `ffmpeg -y -i "${audio.filepath}" -i "${backgroundMusic.filepath}" -filter_complex "[0:a]volume=0.8[a1];[1:a]volume=${musicVolumeToUse}[a2];[a1][a2]amix=inputs=2:duration=longest:weights=3 1[aout]" -map "[aout]" "${mixedAudioPath}"`;

            try {
              await execFFmpeg(mixAudioCommand, "Mezclar audio con música (múltiples videos)", 120000); // 2 minutos

              // Combinar el video concatenado con el audio mezclado
              const audioDuration = audio.duration || 0;
              console.log(`Ajustando la duración del video concatenado con el audio mezclado: ${audioDuration} segundos`);

              // Usamos -t para asegurar que el video tenga la misma duración que el audio
              const finalCommand = `ffmpeg -y -i "${concatOutputPath}" -i "${mixedAudioPath}" -c:v libx264 -c:a aac -map 0:v -map 1:a -t ${audioDuration} "${outputPath}"`;
              await execFFmpeg(finalCommand, "Combinar video concatenado con audio mezclado", 180000); // 3 minutos

              // Limpiar el archivo de audio mezclado
              if (fs.existsSync(mixedAudioPath)) {
                fs.unlinkSync(mixedAudioPath);
              }
            } catch (error) {
              console.error("Error al mezclar audio con música de fondo para videos múltiples:", error);
              // Si hay error con la música de fondo, usar solo el audio principal
              console.log("Usando solo audio principal debido a error con música de fondo");
              const finalCommand = `ffmpeg -y -i "${concatOutputPath}" -i "${audio.filepath}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest "${outputPath}"`;
              await execFFmpeg(finalCommand, "Combinar video concatenado con audio (fallback)", 180000); // 3 minutos
            }
          } else {
            // Sin música de fondo, solo combinamos con el audio principal
            const finalCommand = `ffmpeg -y -i "${concatOutputPath}" -i "${audio.filepath}" -c:v copy -c:a aac -map 0:v -map 1:a -shortest "${outputPath}"`;
            await execFFmpeg(finalCommand, "Combinar video concatenado con audio", 180000); // 3 minutos
          }

          // Limpiar el archivo de concatenación y el video concatenado
          fs.unlinkSync(concatFilePath);
          fs.unlinkSync(concatOutputPath);
        }

        // Limpiar los archivos de video temporales
        for (const video of processedVideos) {
          if (fs.existsSync(video)) {
            fs.unlinkSync(video);
          }
        }


        // Limpiar logo temporal si existe
        if (hasLogo && fs.existsSync(logoTempPath)) {
          fs.unlinkSync(logoTempPath);
        }
      } else {
        throw new Error("No valid photos or uploaded video provided");
      }

      // Save the video record
      const videoData = {
        filename: outputFilename,
        filepath: outputPath,
        duration: audio.duration,
        photoIds: photoIds || [],
        uploadedVideoIds: uploadedVideos.map(v => v.id),
        audioId,
        projectId,
        createdAt: new Date().toISOString()
      };

      const parsedData = insertVideoSchema.parse(videoData);
      const video = await storage.createVideo(parsedData);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.success('VIDEO', `✅ Video generado exitosamente en ${totalTime}s`, {
        videoId: video.id,
        filename: outputFilename,
        duration: totalTime + 's'
      });

      res.status(201).json(video);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('VIDEO', 'Error en generación de video', { error: errorMessage });

      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        // Mostrar error detallado para ayudar en la depuración
        console.error("Error detallado:", errorMessage);
        res.status(500).json({ error: `Error al generar video: ${errorMessage}` });
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

      // Obtener la configuración para usar el título como nombre de archivo
      const appSettings = await storage.getAppSettings();
      let downloadFilename = video.filename;

      // Si hay un título en la configuración, usarlo como nombre de archivo
      if (appSettings && appSettings.titleText && appSettings.titleText.trim()) {
        // Limpiar el texto del título para un nombre de archivo válido
        let cleanTitle = appSettings.titleText
          .replace(/[\r\n\\\/\:\*\?\"\<\>\|]/g, '_') // Reemplazar caracteres no válidos
          .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
          .substring(0, 100); // Limitar longitud

        downloadFilename = `${cleanTitle}.mp4`;
      }

      // Configurar headers para evitar caché
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Descargar el archivo con el nombre adecuado
      res.download(video.filepath, downloadFilename);
    } catch (error) {
      console.error("Error al descargar video:", error);
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

  // Get all saved logos
  app.get("/api/saved-logos", async (req, res) => {
    try {
      const logos = await storage.getSavedLogos();
      res.json(logos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved logos" });
    }
  });

  // Get saved logo by ID
  app.get("/api/saved-logos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logo = await storage.getSavedLogo(id);

      if (!logo) {
        return res.status(404).json({ error: "Saved logo not found" });
      }

      res.json(logo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved logo" });
    }
  });

  // Get saved logo by position (0, 1, 2)
  app.get("/api/saved-logos-by-position/:position", async (req, res) => {
    try {
      const position = parseInt(req.params.position);

      if (isNaN(position) || position < 0 || position > 2) {
        return res.status(400).json({ error: "Invalid position. Must be 0, 1, or 2" });
      }

      const logo = await storage.getSavedLogoByPosition(position);

      if (!logo) {
        return res.status(404).json({ error: "No logo saved at this position" });
      }

      res.json(logo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get saved logo" });
    }
  });

  // Get default saved logo
  app.get("/api/saved-logos-default", async (req, res) => {
    try {
      const logo = await storage.getDefaultSavedLogo();

      if (!logo) {
        return res.status(404).json({ error: "No default logo set" });
      }

      res.json(logo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get default logo" });
    }
  });

  // Save a logo
  app.post("/api/saved-logos", async (req, res) => {
    try {
      const { logoId, name, position, isDefault } = req.body;

      if (!logoId || !name) {
        return res.status(400).json({ error: "Logo ID and name are required" });
      }

      // Verificar si existe el logo
      const logo = await storage.getLogo(logoId);
      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }

      const timestamp = new Date().toISOString();

      const savedLogo = await storage.saveSavedLogo({
        logoId,
        name,
        position: position !== undefined ? position : 0,
        isDefault: isDefault !== undefined ? isDefault : false,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      res.status(201).json(savedLogo);
    } catch (error) {
      res.status(500).json({ error: "Failed to save logo" });
    }
  });

  // Update a saved logo
  app.patch("/api/saved-logos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { logoId, name, position, isDefault } = req.body;

      // Verificar si existe el logo guardado
      const existingLogo = await storage.getSavedLogo(id);
      if (!existingLogo) {
        return res.status(404).json({ error: "Saved logo not found" });
      }

      // Preparar los datos a actualizar
      const timestamp = new Date().toISOString();
      const updateData: any = {
        updatedAt: timestamp
      };

      if (logoId !== undefined) {
        // Verificar si existe el nuevo logo
        const logo = await storage.getLogo(logoId);
        if (!logo) {
          return res.status(404).json({ error: "Logo not found" });
        }
        updateData.logoId = logoId;
      }
      if (name !== undefined) updateData.name = name;
      if (position !== undefined) updateData.position = position;
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      // Actualizar el logo
      const updatedLogo = await storage.updateSavedLogo(id, updateData);

      res.json(updatedLogo);
    } catch (error) {
      res.status(500).json({ error: "Failed to update saved logo" });
    }
  });

  // Delete a saved logo
  app.delete("/api/saved-logos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSavedLogo(id);

      if (!result) {
        return res.status(404).json({ error: "Logo not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved logo" });
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

  // API para gestionar proyectos

  // Endpoint duplicado removido - usar el principal arriba

  // Endpoint duplicado removido - usar el principal arriba

  // Actualizar un proyecto
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const projectId = req.params.id;

      // Verificar si el proyecto existe
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Filtrar solo los campos permitidos para actualizar
      const updateData: any = {};
      const allowedFields = [
        "title", "description", "selectedVoiceId", "selectedLogoId",
        "logoPosition", "showTitle", "titleText", "titleFontSize",
        "titleColor", "titlePosition", "backgroundMusicId",
        "backgroundMusicVolume", "useUploadedVideo", "isTemplate",
        "updatedAt"
      ];

      for (const field of allowedFields) {
        if (field in req.body) {
          updateData[field] = req.body[field];
        }
      }

      // Asegurar que siempre se actualiza la fecha
      if (!updateData.updatedAt) {
        updateData.updatedAt = new Date().toISOString();
      }

      const updatedProject = await storage.updateProject(projectId, updateData);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Eliminar un proyecto
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = req.params.id;

      // Verificar si el proyecto existe
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      // TODO: Implementar borrado de proyectos en storage.ts
      // Actualmente no existe función para borrar proyectos

      // Por ahora, solo devolvemos éxito
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Reiniciar un proyecto (eliminar fotos, videos, audio, y configuraciones)
  app.post("/api/projects/:id/reset", async (req, res) => {
    try {
      const projectId = req.params.id;

      // Verificar si el proyecto existe
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      console.log(`Reiniciando proyecto: ${projectId}`);

      // 1. Eliminar todas las fotos asociadas al proyecto
      const photos = await storage.getPhotosByProjectId(projectId);
      for (const photo of photos) {
        try {
          // Eliminar archivo físico
          if (photo.filepath && fs.existsSync(photo.filepath)) {
            fs.unlinkSync(photo.filepath);
          }
          // Eliminar de la base de datos
          await storage.deletePhoto(photo.id);
        } catch (photoError) {
          console.error(`Error eliminando foto ${photo.id}:`, photoError);
        }
      }

      // 2. Eliminar videos subidos asociados al proyecto
      const uploadedVideos = await storage.getUploadedVideosByProjectId(projectId);
      for (const video of uploadedVideos) {
        try {
          // Eliminar archivo físico
          if (video.filepath && fs.existsSync(video.filepath)) {
            fs.unlinkSync(video.filepath);
          }
          // Eliminar de la base de datos
          await storage.deleteUploadedVideo(video.id);
        } catch (videoError) {
          console.error(`Error eliminando video subido ${video.id}:`, videoError);
        }
      }

      // 3. Eliminar el audio generado para el proyecto
      const audio = await storage.getAudioByProjectId(projectId);
      if (audio) {
        try {
          // Eliminar archivo físico
          if (audio.filepath && fs.existsSync(audio.filepath)) {
            fs.unlinkSync(audio.filepath);
          }
          // Eliminar registro de la base de datos
          await storage.deleteAudio(audio.id);
        } catch (audioError) {
          console.error(`Error eliminando audio:`, audioError);
        }
      }

      // 4. Eliminar el video generado para el proyecto
      const video = await storage.getVideoByProjectId(projectId);
      if (video) {
        try {
          // Eliminar archivo físico
          if (video.filepath && fs.existsSync(video.filepath)) {
            fs.unlinkSync(video.filepath);
          }
          // No hay método para eliminar video, pero se sobrescribirá si se genera uno nuevo
        } catch (videoError) {
          console.error(`Error eliminando video:`, videoError);
        }
      }

      // 5. Restablecer las configuraciones del proyecto a valores por defecto
      const resetConfig = {
        title: existingProject.title, // Mantenemos el título
        description: existingProject.description, // Mantenemos la descripción
        showTitle: false,
        titleText: '',
        titleFontSize: 24,
        titleColor: '#ffffff',
        titlePosition: 'bottom',
        selectedVoiceId: null,
        selectedLogoId: null,
        logoPosition: 'top-right',
        backgroundMusicId: null,
        backgroundMusicVolume: 0.6, // Valor por defecto actualizado a 60%
        useUploadedVideo: false
      };

      await storage.updateProject(projectId, resetConfig);

      res.json({ success: true, message: "Proyecto reiniciado correctamente" });
    } catch (error) {
      console.error("Error resetting project:", error);
      res.status(500).json({ error: "Error al reiniciar el proyecto" });
    }
  });

  // Obtener todos los proyectos (no plantillas)
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  // Obtener todas las plantillas
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  // Obtener la última plantilla
  app.get("/api/templates/latest", async (req, res) => {
    try {
      const latestTemplate = await storage.getLatestTemplate();

      if (!latestTemplate) {
        return res.status(404).json({ error: "No templates found" });
      }

      res.json(latestTemplate);
    } catch (error) {
      console.error("Error getting latest template:", error);
      res.status(500).json({ error: "Failed to get latest template" });
    }
  });

  // Clonar una plantilla (crear un nuevo proyecto basado en una plantilla)
  app.post("/api/projects/clone-template", async (req, res) => {
    try {
      const { templateId } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: "Template ID is required" });
      }

      // Obtener la plantilla
      const template = await storage.getProject(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Crear un nuevo proyecto con los datos de la plantilla
      const newProjectData = {
        id: nanoid(),
        title: `${template.title} (copia)`,
        description: template.description,
        createdAt: new Date().toISOString(),
        selectedVoiceId: template.selectedVoiceId,
        selectedLogoId: template.selectedLogoId,
        logoPosition: template.logoPosition,
        showTitle: template.showTitle,
        titleText: template.titleText,
        titleFontSize: template.titleFontSize,
        titleColor: template.titleColor,
        titlePosition: template.titlePosition,
        backgroundMusicId: template.backgroundMusicId,
        backgroundMusicVolume: template.backgroundMusicVolume,
        useUploadedVideo: template.useUploadedVideo,
        isTemplate: false,
      };

      const newProject = await storage.createProject(newProjectData);

      res.status(201).json(newProject);
    } catch (error) {
      console.error("Error cloning template:", error);
      res.status(500).json({ error: "Failed to clone template" });
    }
  });

  // Obtener videos subidos para un proyecto
  // Endpoint duplicado removido - usar el principal arriba

  // API para gestionar música de fondo

  // Obtener toda la música de fondo
  app.get("/api/background-music", async (req, res) => {
    try {
      const music = await storage.getBackgroundMusic();
      res.json(music);
    } catch (error) {
      res.status(500).json({ error: "Failed to get background music" });
    }
  });

  // Obtener música por ID
  app.get("/api/background-music/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const music = await storage.getBackgroundMusicById(id);

      if (!music) {
        return res.status(404).json({ error: "Music not found" });
      }

      res.json(music);
    } catch (error) {
      res.status(500).json({ error: "Failed to get music" });
    }
  });

  // Stream music file
  app.get("/api/background-music/:id/stream", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const music = await storage.getBackgroundMusicById(id);

      if (!music) {
        return res.status(404).json({ error: "Music not found" });
      }

      // Stream the audio file
      const stat = fs.statSync(music.filepath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(music.filepath, { start, end });

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

        fs.createReadStream(music.filepath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stream music" });
    }
  });

  // Subir música de fondo
  app.post("/api/background-music", musicUpload.single("music"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Obtener duración usando ffprobe
      const filePath = req.file.path;
      let duration = 0;

      try {
        const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        duration = Math.round(parseFloat(stdout.trim()));
      } catch (e) {
        console.error("Error getting duration:", e);
        // Continuar sin duración si falla
      }

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
      // Limpiar archivo en caso de error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) { }
      }

      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to upload music" });
      }
    }
  });

  // Eliminar música
  app.delete("/api/background-music/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const music = await storage.getBackgroundMusicById(id);

      if (!music) {
        return res.status(404).json({ error: "Music not found" });
      }

      // Eliminar archivo
      if (fs.existsSync(music.filepath)) {
        fs.unlinkSync(music.filepath);
      }

      await storage.deleteBackgroundMusic(id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete music" });
    }
  });

  // ============================================
  // API DE LOGS - Sistema de logging robusto
  // ============================================

  // Obtener logs con filtros
  app.get("/api/logs", (req, res) => {
    try {
      const { level, category, search, limit, offset, startDate, endDate } = req.query;

      const result = logger.getLogs({
        level: level as any,
        category: category as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error fetching logs" });
    }
  });

  // Obtener estadísticas de logs
  app.get("/api/logs/stats", (req, res) => {
    try {
      const stats = logger.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Error fetching log stats" });
    }
  });

  // Obtener categorías de logs
  app.get("/api/logs/categories", (req, res) => {
    try {
      const categories = logger.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Error fetching categories" });
    }
  });

  // Limpiar logs antiguos
  app.delete("/api/logs/old", (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const result = logger.clearOldLogs(days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error clearing old logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
