

import { GoogleGenAI, Type } from "@google/genai";

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
    const { frames, gameName, sensitivity } = await request.json();
    
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
    
    let sensitivityContext = "";
    if (typeof sensitivity === 'number' && isFinite(sensitivity)) {
        sensitivityContext = `
        The player has provided their current in-game sensitivity: ${sensitivity}.
        Please factor this directly into your analysis. If their aim seems unstable (shaky, over-flicking) or too slow (unable to track targets), suggest a specific, percentage-based adjustment to this value. For example: "Your aim appears slightly shaky. Consider lowering your sensitivity by 10% to around ${(sensitivity * 0.9).toFixed(2)} to improve control." or "You had trouble tracking the fast-moving target. Try increasing your sensitivity by 5% to ${(sensitivity * 1.05).toFixed(2)}." If their sensitivity seems well-suited to their performance in the clip, affirm that.
        `;
    }

    const prompt = `
      You are Sensei AI, a world-class esports performance coach with a specialization in FPS games like ${gameName}. Your analysis is sharp, insightful, and always focused on helping players improve.
      A player has submitted a screen recording. I am providing you with ${frames.length} key frames from their gameplay.
      ${sensitivityContext}
      Your task is to perform a deep analysis of these frames, focusing on Crosshair Discipline, Aim Mechanics, and Movement/Positioning.

      You must provide your response as a single JSON object that conforms to the provided schema. This JSON must contain:
      1. A detailed, text-based 'analysis' in Markdown format. This analysis must include a summary, actionable coaching tips (for sensitivity, crosshair placement, positioning), and a recommended drill.
      2. A 'visual_data' array containing coordinate data for the crosshair and any enemies in each frame. This data must be normalized (0.0 to 1.0). If a crosshair isn't visible, its value should be null. If no enemies are visible, the enemies array should be empty.
    `;
    
    const contents = [{ parts: [{ text: prompt }, ...imageParts] }];

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        analysis: {
          type: Type.STRING,
          description: "Your complete text-based report in Markdown format. The report should include: **Sensei's Analysis:** (a summary), **Actionable Coaching:** (specific tips on Sensitivity/Aim, Crosshair Placement, Positioning), and **Recommended Drill:** (a specific drill to practice)."
        },
        visual_data: {
          type: Type.ARRAY,
          description: "An array of data points for each frame provided.",
          items: {
            type: Type.OBJECT,
            properties: {
              frame_index: { type: Type.INTEGER, description: "The zero-based index of the frame." },
              crosshair: {
                type: Type.OBJECT,
                description: "The normalized (0.0-1.0) coordinates of the crosshair's center. Null if not visible.",
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                nullable: true,
              },
              enemies: {
                type: Type.ARRAY,
                description: "An array of bounding boxes for visible enemies. Empty if none are visible.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized (0.0-1.0) x-coordinate of the top-left corner." },
                    y: { type: Type.NUMBER, description: "Normalized (0.0-1.0) y-coordinate of the top-left corner." },
                    width: { type: Type.NUMBER, description: "Normalized (0.0-1.0) width of the box." },
                    height: { type: Type.NUMBER, description: "Normalized (0.0-1.0) height of the box." },
                  },
                },
              },
            },
          },
        },
      },
      required: ["analysis", "visual_data"],
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    
    return new Response(JSON.stringify({ analysis: JSON.parse(response.text) }), {
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
