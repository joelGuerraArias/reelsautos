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
    // Rechazar archivos AVIF directamente
    if (file.type === 'image/avif') {
      console.log('Validando archivo AVIF:', file.name);
      
      // Rechazamos completamente el formato AVIF
      resolve({ 
        isValid: false, 
        error: "El formato AVIF no está soportado. Por favor, sube una imagen en formato JPEG, PNG o WEBP."
      });
      return;
    }
    
    // Para todos los demás formatos de imagen, usamos el enfoque estándar
    const img = new Image();
    img.onload = () => {
      // Get the dimensions
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      // Accept all aspect ratios
      const aspectRatio = width / height;
      
      // Verificar solo el tamaño mínimo para asegurar calidad
      if (width < 640 || height < 360) {
        resolve({ 
          isValid: false, 
          error: `Imagen demasiado pequeña. Tamaño mínimo: 640x360px, imagen actual: ${width}x${height}px`,
          width,
          height
        });
      } else {
        resolve({ isValid: true, width, height });
      }
    };
    
    img.onerror = () => {
      resolve({ 
        isValid: false, 
        error: "No se pudo cargar la imagen. Verifica que el archivo sea una imagen válida."
      });
    };
    
    // Load the image from the file
    img.src = URL.createObjectURL(file);
  });
}
