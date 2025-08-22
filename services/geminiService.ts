
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

      const captureFrameAt = (time: number) => {
        return new Promise<void>((resolveSeek) => {
          video.currentTime = time;
          video.onseeked = () => {
             if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
              if (base64Data) {
                frames.push(base64Data);
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
  const frames = await extractFramesFromVideo(videoBlob, 4);
  if (frames.length === 0) {
    throw new Error("Could not extract any frames from the video. The file might be corrupt or in an unsupported format. Please try a different recording.");
  }

  const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frames, gameName }),
  });

  const data = await response.json().catch(() => {
    // Handle cases where response is not valid JSON (e.g., HTML error page from Vercel)
    throw new Error(`Server returned an invalid response: ${response.status} ${response.statusText}`);
  });

  if (!response.ok) {
      const errorMessage = data.error || `An unknown server error occurred (${response.status}).`;
      throw new Error(errorMessage);
  }
  
  if (!data.analysis) {
      throw new Error("Analysis failed: The AI did not return a result. This could be a temporary issue with the service.");
  }

  return data.analysis;
};
