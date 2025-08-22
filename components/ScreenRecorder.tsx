
import React, { useState, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, UploadCloud, ArrowLeft } from 'lucide-react';

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onBack: () => void;
  gameName: string;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ onRecordingComplete, onBack, gameName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    setError(null);
    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: includeAudio,
      });
      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        onRecordingComplete(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting screen recording:", err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
          setError("Screen recording permission was denied. Please allow permission and try again.");
      } else {
          setError("Could not start screen recording. Please ensure you have a compatible browser and permissions are enabled.");
      }
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
          setError('Please upload a valid video file.');
          return;
      }
      setError(null);
      onRecordingComplete(file);
    }
  };


  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-2xl mx-auto w-full">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-brand-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        aria-label="Go back to game selection"
        >
        <ArrowLeft size={24} />
      </button>

      <h2 className="text-2xl font-bold text-white mb-2 text-center">Analyze Gameplay for {gameName}</h2>
      <p className="text-brand-text-muted text-center mb-8">
        Provide a short clip (1-2 minutes) of your gameplay. Record your screen or upload a video file.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Recording Section */}
        <div className="flex flex-col items-center p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Record Gameplay</h3>
          <div className="flex space-x-4">
            <button
              onClick={handleToggleRecording}
              disabled={!!error && error.includes('permission was denied')}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-cyan-500'
              }`}
            >
              {isRecording ? <VideoOff size={20} /> : <Video size={20} />}
              <span>{isRecording ? 'Stop' : 'Record'}</span>
            </button>
            <button
              onClick={() => setIncludeAudio(!includeAudio)}
              disabled={isRecording}
              className="p-3 rounded-lg bg-gray-600 hover:bg-gray-500 text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={includeAudio ? 'Disable microphone' : 'Enable microphone'}
            >
              {includeAudio ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="flex flex-col items-center p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Upload a Clip</h3>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isRecording}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center space-x-2 bg-brand-secondary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud size={20} />
            <span>Choose File</span>
          </button>
        </div>
      </div>


      {isRecording && (
        <div className="mt-6 flex items-center space-x-2 text-yellow-400">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording in progress... Stop sharing in your browser to finish.</span>
        </div>
      )}

      {error && <p className="mt-6 text-red-400 text-center">{error}</p>}
    </div>
  );
};

export default ScreenRecorder;
