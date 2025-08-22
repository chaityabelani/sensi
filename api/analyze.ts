
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { frames, gameName } = await request.json();
    
    if (!frames || !gameName || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields: frames and gameName' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      console.error("API_KEY environment variable not set on server");
      return new Response(JSON.stringify({ error: 'The API_KEY environment variable is not set on the server. Please add it to your Vercel project settings.' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const imageParts = frames.map((frame: string) => ({
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
    
    return new Response(JSON.stringify({ analysis: response.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analysis API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `An error occurred during analysis: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}