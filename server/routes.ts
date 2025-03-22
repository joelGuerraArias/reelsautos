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
      
      // Get app settings for logo and text overlay
      const appSettings = await storage.getAppSettings();
      
      // Calculate duration for each photo
      const audioDuration = audio.duration || 0;
      const photoDuration = audioDuration / photos.length;
      
      // Generate the output video filename
      const outputFilename = `video_${nanoid()}.mp4`;
      const outputPath = path.join(VIDEO_DIR, outputFilename);
      
      // Simplified approach without zoom effect
      // For multiple photos, create temporary directory for intermediate files
      const tempDir = path.join(process.cwd(), 'temp_video');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      // Create a text file for concatenation
      let concatContent = "";
      
      // Define paths for the selected logo
      const LOGOS = [
        { id: 1, src: "https://i.imgur.com/0RUbNyv.png" },
        { id: 2, src: "https://i.imgur.com/YSdjS5J.png" },
        { id: 3, src: "https://i.imgur.com/Xy95ldT.png" }
      ];
      
      // Download selected logo to temp directory
      const selectedLogo = LOGOS.find(l => l.id === (appSettings?.selectedLogoId || 1));
      const logoTempPath = path.join(tempDir, `logo_${nanoid()}.png`);
      const logoPosition = appSettings?.logoPosition || "top-right";
      let logoOverlay = '';
      
      if (selectedLogo) {
        try {
          const logoResponse = await axios.get(selectedLogo.src, { responseType: 'arraybuffer' });
          fs.writeFileSync(logoTempPath, Buffer.from(logoResponse.data, 'binary'));
          
          // Determine position coordinates for logo
          let logoX = '10';
          let logoY = '10';
          
          if (logoPosition === 'top-right') {
            logoX = 'main_w-overlay_w-10';
            logoY = '10';
          } else if (logoPosition === 'bottom-left') {
            logoX = '10';
            logoY = 'main_h-overlay_h-10';
          } else if (logoPosition === 'bottom-right') {
            logoX = 'main_w-overlay_w-10';
            logoY = 'main_h-overlay_h-10';
          }
          
          logoOverlay = `,overlay=${logoX}:${logoY}`;
        } catch (error) {
          console.error("Error downloading logo:", error);
          // Continue without logo if there's an error
        }
      }
      
      // Prepare text overlay if enabled
      let textOverlay = '';
      if (appSettings?.showTitle && appSettings?.titleText) {
        const textColor = appSettings.titleColor || '#ffffff';
        const fontSize = appSettings.titleFontSize || 32;
        const textPosition = appSettings.titlePosition || 'top-center';
        const text = appSettings.titleText.replace(/'/g, "\\'"); // Escape single quotes
        
        // Determine position coordinates for text
        let textX = '(w-text_w)/2';
        let textY = '30';
        
        if (textPosition === 'bottom-center') {
          textX = '(w-text_w)/2';
          textY = 'h-th-30';
        } else if (textPosition === 'center-center') {
          textX = '(w-text_w)/2';
          textY = '(h-th)/2';
        }
        
        textOverlay = `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':fontcolor=${textColor}:fontsize=${fontSize}:x=${textX}:y=${textY}`;
      }

      if (photos.length === 1 && photos[0]) {
        // For single photo, simple static image with audio with overlays
        const command = `ffmpeg -loop 1 -t ${audioDuration} -i "${photos[0].filepath}" -i "${audio.filepath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2${logoOverlay}${textOverlay}" -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;
        await exec(command);
      } else if (photos.length > 1) {
        // For multiple photos, create a slideshow with equal duration for each photo
        
        // Process each photo individually
        for (let i = 0; i < photos.length; i++) {
          if (photos[i]) {
            // Create a static image segment
            const tempOutput = path.join(tempDir, `temp_${i}.mp4`);
            const photoCommand = `ffmpeg -loop 1 -t ${photoDuration} -i "${photos[i].filepath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p "${tempOutput}"`;
            await exec(photoCommand);
            
            // Add to concat file
            if (tempOutput) {
              concatContent += `file '${tempOutput}'\n`;
            }
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
            // Try to remove temp directory
            if (fs.existsSync(tempDir)) {
              fs.rmdirSync(tempDir);
            }
          } catch (e) {
            console.warn("Error cleaning up temp files:", e);
          }
        }, 5000);
      } else {
        throw new Error("No valid photos provided");
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
