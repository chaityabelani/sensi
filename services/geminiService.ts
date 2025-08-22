
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const extractFramesFromVideo = (videoBlob: Blob, frameCount: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const interval = duration > 1 ? duration / (frameCount + 1) : 0.1;
      let framesExtracted = 0;

      const captureFrameAt = (time: number) => {
        return new Promise<void>((resolveSeek) => {
          video.currentTime = time;
          video.onseeked = () => {
             if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
              if (base64Data) {
                frames.push(base64Data);
                framesExtracted++;
              }
            }
            resolveSeek();
          };
        });
      };

      for (let i = 1; i <= frameCount; i++) {
        await captureFrameAt(i * interval);
      }
      
      URL.revokeObjectURL(video.src);
      resolve(frames);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject('Error loading video file for frame extraction.');
    };
  });
};

export const analyzeGameplay = async (videoBlob: Blob, gameName: string): Promise<string> => {
  try {
    const frames = await extractFramesFromVideo(videoBlob, 4);
    if (frames.length === 0) {
      return "Could not extract frames from the video. Please try a different recording.";
    }

    const imageParts = frames.map(frame => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame,
      },
    }));

    const prompt = `
      You are an expert FPS gaming coach and analyst. Your name is Sensei AI.
      A player has submitted a screen recording from the game: ${gameName}.
      I am providing you with ${frames.length} frames from their gameplay.

      Your task is to analyze these frames and provide constructive feedback. Focus on:
      1.  **Crosshair Placement:** Is it at head level? Is it positioned where enemies are likely to appear?
      2.  **Aim & Recoil Control:** How is their aim during engagements? Can you infer anything about their recoil control from the bullet tracers or hit markers (if visible)?
      3.  **Situational Awareness:** Based on the UI, positioning, and what's visible, what can you say about their awareness?

      Based on your analysis, provide a concise report in the following format:
      **Sensei's Analysis:**
      A paragraph summarizing your key observations.

      **Actionable Tips:**
      * A specific, actionable tip related to sensitivity (e.g., "Your aim seems jittery, consider lowering your sensitivity by 10%.").
      * A specific, actionable tip related to crosshair placement (e.g., "Practice keeping your crosshair at head-level when clearing corners.").
      * A specific drill or practice routine they can do to improve.

      Be encouraging and professional. Remember that your analysis is based on limited data.
    `;
    
    const contents = [{ parts: [{ text: prompt }, ...imageParts] }];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error analyzing gameplay:", error);
    if (error instanceof Error) {
        return `An error occurred during analysis: ${error.message}. Please try again.`;
    }
    return "An unknown error occurred during analysis. Please try again.";
  }
};
