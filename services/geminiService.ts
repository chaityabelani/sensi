
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
  try {
    const frames = await extractFramesFromVideo(videoBlob, 4);
    if (frames.length === 0) {
      return "Could not extract frames from the video. Please try a different recording.";
    }

    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frames, gameName }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status} ${response.statusText}`}));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.analysis;

  } catch (error) {
    console.error("Error analyzing gameplay:", error);
    if (error instanceof Error) {
        return `An error occurred during analysis: ${error.message}. Please try again.`;
    }
    return "An unknown error occurred during analysis. Please try again.";
  }
};
