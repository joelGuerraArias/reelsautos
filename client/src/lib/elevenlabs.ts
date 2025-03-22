import { ElevenLabsVoice } from "@shared/schema";

/**
 * Fetches available voices from the Eleven Labs API
 */
export async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch("/api/voices");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Error fetching voices:", error);
    throw error;
  }
}

/**
 * Generates audio from text using the Eleven Labs API
 */
export async function generateAudio(text: string, voiceId: string, projectId: string): Promise<any> {
  try {
    const response = await fetch("/api/audios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: voiceId,
        projectId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to generate audio: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}
