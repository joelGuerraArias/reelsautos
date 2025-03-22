/**
 * Generates a video from photos and audio using the server API
 */
export async function generateVideo(photoIds: string[], audioId: number, projectId: string): Promise<any> {
  try {
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        photoIds,
        audioId,
        projectId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to generate video: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
}

/**
 * Downloads a video file from the server
 */
export function downloadVideo(videoId: number): void {
  window.location.href = `/api/videos/${videoId}/download`;
}
