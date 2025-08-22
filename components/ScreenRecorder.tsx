
import React, { useState, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Rss, ArrowLeft } from 'lucide-react';

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

  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-lg mx-auto">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-brand-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
        aria-label="Go back to game selection"
        >
        <ArrowLeft size={24} />
      </button>

      <Rss className="w-16 h-16 text-brand-primary mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2 text-center">Record Gameplay for {gameName}</h2>
      <p className="text-brand-text-muted text-center mb-6">
        Record a short clip (1-2 minutes) of your gameplay. Make sure it includes aiming and engagements.
      </p>
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleToggleRecording}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center space-x-2 ${
            isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-cyan-500'
          }`}
        >
          {isRecording ? <VideoOff size={20} /> : <Video size={20} />}
          <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
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

      {isRecording && (
        <div className="flex items-center space-x-2 text-yellow-400">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording in progress... Stop sharing in your browser to finish.</span>
        </div>
      )}

      {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
    </div>
  );
};

export default ScreenRecorder;
