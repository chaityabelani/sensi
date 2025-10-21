import React, { useState, useRef, useCallback } from 'react';
import { Video, UploadCloud, ArrowLeft, Lightbulb, Focus, Clock, Target, Play } from 'lucide-react';

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob, sensitivity: number | null) => void;
  onBack: () => void;
  gameName: string;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ onRecordingComplete, onBack, gameName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [sensitivity, setSensitivity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  }, []);
  
  const getSensitivity = (): number | null => {
      const sens = parseFloat(sensitivity);
      return isNaN(sens) ? null : sens;
  }

  const startRecording = async () => {
    setError(null);
    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false, // Audio is not needed for analysis, simplifying permissions
      });
      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        onRecordingComplete(blob, getSensitivity());
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
      onRecordingComplete(file, getSensitivity());
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel max-w-4xl mx-auto w-full">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-brand-text-muted hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-brand-panel"
        aria-label="Go back"
        >
        <ArrowLeft size={24} />
      </button>

      <h2 className="text-3xl font-bold text-brand-text mb-2 text-center tracking-tighter">Gameplay Analysis</h2>
      <p className="text-brand-text-muted text-center mb-8">
        Submit a short clip (1-2 mins) for AI-powered feedback.
      </p>
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Config & Tips */}
        <div className="lg:col-span-2 space-y-6">
            <div>
              <label htmlFor="sensitivity" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center">
                  <Target size={16} className="mr-2 text-brand-secondary" />
                  In-Game Sensitivity (Optional)
              </label>
              <input
                  type="number"
                  name="sensitivity"
                  id="sensitivity"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value)}
                  className="bg-brand-bg border border-brand-panel text-brand-text text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-3 placeholder-brand-text-muted/50"
                  placeholder="e.g., 0.45"
                  step="0.01"
              />
            </div>
            
            <div className="w-full bg-brand-bg/50 rounded-lg border border-brand-panel p-4 text-left">
              <h3 className="text-md font-semibold text-brand-text mb-3 flex items-center">
                <Lightbulb size={18} className="mr-2 text-yellow-400" />
                System Alert: Best Practices
              </h3>
              <ul className="space-y-2 text-brand-text-muted text-xs">
                <li className="flex items-start"><Video size={14} className="mr-2 mt-0.5 text-brand-primary flex-shrink-0" /><span>Use clear, smooth footage (720p+, 30fps+).</span></li>
                <li className="flex items-start"><Focus size={14} className="mr-2 mt-0.5 text-brand-primary flex-shrink-0" /><span>Capture a typical gunfight with aiming and movement.</span></li>
                <li className="flex items-start"><Clock size={14} className="mr-2 mt-0.5 text-brand-primary flex-shrink-0" /><span>Keep clips under 2 minutes for best results.</span></li>
              </ul>
            </div>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center p-6 bg-brand-bg/50 rounded-lg border border-brand-panel">
                <h3 className="text-lg font-semibold text-brand-text mb-4">Record New Clip</h3>
                <button
                onClick={startRecording}
                disabled={isRecording}
                className="w-full px-6 py-4 rounded-lg font-semibold text-black transition-all duration-300 flex items-center justify-center space-x-2 bg-brand-primary hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/40"
                >
                <Video size={20} />
                <span>Start Recording</span>
                </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-brand-bg/50 rounded-lg border border-brand-panel">
                <h3 className="text-lg font-semibold text-brand-text mb-4">Upload Existing File</h3>
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
                    className="w-full px-6 py-4 rounded-lg font-semibold text-brand-text transition-all duration-300 flex items-center justify-center space-x-2 bg-brand-panel hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-secondary/40"
                >
                    <UploadCloud size={20} />
                    <span>Choose File</span>
                </button>
            </div>
        </div>
      </div>

      {isRecording && (
        <div className="mt-6 flex items-center space-x-3 text-yellow-400 p-3 bg-yellow-900/50 rounded-lg border border-yellow-400/30">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span>Recording in progress... Stop sharing in your browser to finish.</span>
        </div>
      )}

      {error && <p className="mt-6 text-red-400 text-center bg-red-900/50 p-3 rounded-lg border border-red-500/30">{error}</p>}
    </div>
  );
};

export default ScreenRecorder;