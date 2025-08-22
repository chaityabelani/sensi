
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
      You are Sensei AI, a world-class esports performance coach with a specialization in FPS games like ${gameName}. Your analysis is sharp, insightful, and always focused on helping players improve.
      A player has submitted a screen recording. I am providing you with ${frames.length} key frames from their gameplay.

      Your task is to perform a deep analysis of these frames. Focus on the following key areas:
      1.  **Crosshair Discipline:** Is their crosshair consistently at head or chest level? Are they pre-aiming common angles or corners? Does their crosshair placement dip when they are moving or not in a fight?
      2.  **Aim Mechanics & Recoil Control:** During engagements, analyze their spray control. Is there evidence of micro-corrections? Do they seem to be over-flicking or under-flicking targets? Is their tracking smooth on moving targets?
      3.  **Movement & Positioning:** Are they using cover effectively, or are they caught in the open? Is their movement purposeful (e.g., jiggle-peeking, counter-strafing)? Are they exposing themselves to multiple angles unnecessarily?

      Based on your deep analysis, provide a concise and encouraging report in the following format. Use markdown for formatting.

      **Sensei's Analysis:**
      A summary paragraph of your key observations, highlighting their biggest strength and their primary area for improvement based on the provided frames.

      **Actionable Coaching:**
      *   **Sensitivity & Aim:** Provide a specific tip related to their sensitivity or aim mechanics. For example: "Your aim appears slightly shaky during sprays. Consider lowering your in-game sensitivity by 5-10% to gain more control." or "You over-flicked the target on the left. Practice flick-shots in the training range to build muscle memory."
      *   **Crosshair Placement:** Give a concrete tip on how to improve their crosshair placement. For example: "When moving into a new area, actively 'slice the pie' and keep your crosshair glued to the next possible enemy position."
      *   **Positioning:** Offer advice on their movement or use of cover. For example: "In the third frame, you were exposed from two different angles. Try to isolate your fights by using nearby cover more effectively."

      **Recommended Drill:**
      Suggest one specific, actionable drill they can do in-game or in an aim trainer to address the main weakness you identified. For example: "To improve your recoil control, go to the practice range, stand 20m from a wall, and practice spraying so the bullet holes form a tight cluster. Do this for 5 minutes before you play."

      Be professional and encouraging. Remember your analysis is based on a snapshot of their gameplay.
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