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
  generateAudioSchema,
  generateVideoSchema,
  PhotoValidationResponse
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const exec = promisify(child_process.exec);

// Set up directories for file storage
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const PHOTO_DIR = path.join(UPLOAD_DIR, "photos");
const AUDIO_DIR = path.join(UPLOAD_DIR, "audios");
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");

// Create directories if they don't exist
fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// Configure multer for file uploads
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
          model_id: "eleven_monolingual_v1",
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

  // Generate video from photos and audio
  app.post("/api/videos", async (req, res) => {
    try {
      const validatedData = generateVideoSchema.parse(req.body);
      const { photoIds, audioId, projectId } = validatedData;
      
      // Get the audio and photos
      const audio = await storage.getAudio(audioId);
      if (!audio) {
        return res.status(404).json({ error: "Audio not found" });
      }
      
      const photos = await Promise.all(
        photoIds.map(async (id) => await storage.getPhoto(parseInt(id)))
      );
      
      // Ensure all photos exist
      if (photos.includes(undefined)) {
        return res.status(404).json({ error: "One or more photos not found" });
      }
      
      // Calculate duration for each photo
      const audioDuration = audio.duration || 0;
      const photoDuration = audioDuration / photos.length;
      
      // Create a temporary file with the FFmpeg input commands
      const inputFile = path.join(UPLOAD_DIR, `input_${nanoid()}.txt`);
      let inputContent = "";
      
      // Add each photo with its duration
      photos.forEach((photo) => {
        if (photo) {
          inputContent += `file '${photo.filepath}'\n`;
          inputContent += `duration ${photoDuration}\n`;
        }
      });
      
      // Write the input file
      fs.writeFileSync(inputFile, inputContent);
      
      // Generate the output video filename
      const outputFilename = `video_${nanoid()}.mp4`;
      const outputPath = path.join(VIDEO_DIR, outputFilename);
      
      // Use FFmpeg to create the video
      await exec(
        `ffmpeg -f concat -safe 0 -i "${inputFile}" -i "${audio.filepath}" -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`
      );
      
      // Clean up the input file
      fs.unlinkSync(inputFile);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
