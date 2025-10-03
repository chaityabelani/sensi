

import type { AnalysisResponse } from '../types';

export const extractFramesFromVideo = (
  videoBlob: Blob, 
  frameCount: number,
  onProgress: (progress: number) => void
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
      // Remove event listeners
      video.onloadedmetadata = null;
      video.onerror = null;
      // Remove elements from DOM
      video.remove();
      canvas.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Frame extraction timed out (15s). The video file may be too large or in an unsupported format.'));
    }, 15000);

    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;

    const context = canvas.getContext('2d');
    const frames: string[] = [];

    video.onloadedmetadata = async () => {
      if (!context || video.videoWidth === 0 || !isFinite(video.duration)) {
        cleanup();
        return reject(new Error('Video metadata is invalid. The file may be corrupt or in an unsupported format.'));
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const interval = duration > 1 ? duration / (frameCount + 1) : 0.1;

      const captureFrameAt = (time: number) => new Promise<void>((resolveSeek, rejectSeek) => {
          video.currentTime = time;
          // 'seeked' may not fire for the very first frame in some browsers, 
          // 'loadeddata' can be a fallback. Using 'seeked' is generally more reliable for subsequent frames.
          const onSeeked = () => {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
            if (base64Data) {
              frames.push(base64Data);
            }
            resolveSeek();
          };
          video.addEventListener('seeked', onSeeked, { once: true });
          video.addEventListener('error', () => rejectSeek(new Error('Error seeking video to capture a frame.')), { once: true });
      });

      try {
        for (let i = 1; i <= frameCount; i++) {
          await captureFrameAt(i * interval);
          onProgress(i / frameCount); // Report progress as a fraction (0 to 1)
        }
        cleanup();
        resolve(frames);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Error loading video file. Please check the file format and try again.'));
    };
  });
};

export const analyzeGameplay = async (
    frames: string[], 
    gameName: string,
    sensitivity: number | null,
    onProgress: (message: string, percentage: number | null) => void
): Promise<AnalysisResponse> => {
   if (frames.length === 0) {
    throw new Error("No frames were provided for analysis.");
  }

  onProgress("Sending gameplay to Sensei AI for analysis...", null); // Indeterminate state

  const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frames, gameName, sensitivity }),
  });

  const data = await response.json().catch(() => {
    // Handle cases where response is not valid JSON (e.g., HTML error page from Vercel)
    throw new Error(`Server returned an invalid response: ${response.status} ${response.statusText}`);
  });

  if (!response.ok) {
      const errorMessage = data.error || `An unknown server error occurred (${response.status}).`;
      throw new Error(errorMessage);
  }
  
  if (!data.analysis || !data.analysis.analysis || !data.analysis.visual_data) {
      throw new Error("Analysis failed: The AI did not return a valid result. This could be a temporary issue with the service.");
  }

  return data.analysis;
};
