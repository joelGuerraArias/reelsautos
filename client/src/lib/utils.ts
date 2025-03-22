import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PhotoValidationResponse } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export async function validatePhoto(file: File): Promise<PhotoValidationResponse & { width?: number, height?: number }> {
  return new Promise((resolve) => {
    // Create an image element to check dimensions
    const img = new Image();
    img.onload = () => {
      // Get the dimensions
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      // Check aspect ratio
      const aspectRatio = width / height;
      const targetRatio = 16 / 9;
      const ratioTolerance = 0.01; // Allow small deviation from exact ratio
      
      if (Math.abs(aspectRatio - targetRatio) > ratioTolerance) {
        resolve({ 
          isValid: false, 
          error: `Invalid aspect ratio. Expected 16:9 (${targetRatio.toFixed(2)}), got ${aspectRatio.toFixed(2)}`,
          width,
          height
        });
      } else {
        resolve({ isValid: true, width, height });
      }
    };
    
    img.onerror = () => {
      resolve({ isValid: false, error: "Failed to load image" });
    };
    
    // Load the image from the file
    img.src = URL.createObjectURL(file);
  });
}
