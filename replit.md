# FotoToVideo Application

## Overview

FotoToVideo is a video creation platform that enables users to generate videos from photos and text using Eleven Labs for audio generation. The application supports photo uploads, text-to-speech conversion, video configuration with logos and titles, and final video compilation using FFmpeg.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **File Processing**: FFmpeg for video generation and manipulation
- **File Storage**: Local filesystem with organized directory structure
- **API**: RESTful endpoints for all operations

### Key Technologies
- **TypeScript**: Full-stack type safety
- **ESM**: Modern ES modules throughout
- **Multer**: File upload handling
- **Axios**: HTTP client for external API calls
- **Nanoid**: Unique ID generation

## Key Components

### Data Models
- **Users**: Basic user authentication system
- **Projects**: Video project management with template support
- **Photos**: Image upload and metadata storage
- **Audios**: Text-to-speech audio generation results
- **Videos**: Final video compilation outputs
- **Logos**: Logo management for video branding
- **Background Music**: Audio track management
- **Uploaded Videos**: User-provided video content

### File Management
- **Upload Directory Structure**:
  - `/uploads/photos/` - User uploaded images
  - `/uploads/audios/` - Generated speech audio files
  - `/uploads/videos/` - Final compiled videos
  - `/uploads/logos/` - Logo images
  - `/uploads/background_music/` - Background audio tracks
  - `/uploads/uploaded_videos/` - User uploaded video content

### Video Processing Pipeline
1. **Photo Upload**: Validation and storage of user images
2. **Audio Generation**: Text-to-speech using Eleven Labs API
3. **Video Configuration**: Logo placement, title overlays, background music
4. **Video Compilation**: FFmpeg processing to create final video

## Data Flow

### User Workflow
1. **Project Creation**: Generate unique project ID
2. **Photo Upload**: Multiple image upload with validation
3. **Audio Generation**: Text input → Eleven Labs API → Audio file
4. **Video Settings**: Configure logos, titles, music, and layout
5. **Video Generation**: Combine all assets using FFmpeg
6. **Project Management**: Save, load, and template creation

### API Integration
- **Eleven Labs**: Text-to-speech voice synthesis
- **Internal APIs**: Project CRUD, file management, video processing

## External Dependencies

### Third-Party Services
- **Eleven Labs API**: Voice synthesis and text-to-speech conversion
- **Neon Database**: Serverless PostgreSQL hosting

### Development Tools
- **FFmpeg**: Video processing and compilation (system dependency)
- **PostgreSQL**: Database engine
- **Replit**: Development and deployment environment

### Key Libraries
- **@neondatabase/serverless**: Database connection with WebSocket support
- **@radix-ui/react-***: UI component primitives
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database ORM

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20
- **Database**: PostgreSQL 16 module
- **Build Process**: Vite development server with HMR
- **File System**: Local uploads directory

### Production Environment
- **Platform**: Google Cloud Engine (GCE)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port Configuration**: Internal 5000, External 80

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string (required)
- **ELEVEN_LABS_API_KEY**: Voice synthesis API access (likely required)

### File Structure
```
/
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared TypeScript schemas and types
├── uploads/         # File storage directory
├── temp_video/      # Temporary video processing files
└── migrations/      # Database migration files
```

## Changelog
- June 25, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.