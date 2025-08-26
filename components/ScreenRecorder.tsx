import React, { useState, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, UploadCloud, ArrowLeft, Lightbulb, Focus, Clock, Target } from 'lucide-react';

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob, sensitivity: number | null) => void;
  onBack: () => void;
  gameName: string;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ onRecordingComplete, onBack, gameName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
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
      onRecordingComplete(file, getSensitivity());
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
      <p className="text-brand-text-muted text-center mb-6">
        Provide a short clip (1-2 minutes) of your gameplay. For more accurate feedback, enter your sensitivity.
      </p>
      
       <div className="w-full mb-6">
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
            className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
            placeholder="e.g., 0.45"
            step="0.01"
        />
      </div>

      <div className="w-full bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8 text-left">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Lightbulb size={20} className="mr-2 text-yellow-400" />
          Pro Tips & Limitations
        </h3>
        <ul className="space-y-3 text-brand-text-muted text-sm">
          <li className="flex items-start">
            <Video size={16} className="mr-3 mt-1 text-brand-primary flex-shrink-0" />
            <span><strong>Quality In, Quality Out:</strong> For best results, use a clear, smooth video (720p+, 30fps+). Choppy or low-res clips are harder for the AI to analyze accurately.</span>
          </li>
          <li className="flex items-start">
            <Focus size={16} className="mr-3 mt-1 text-brand-primary flex-shrink-0" />
            <span><strong>Show a Typical Fight:</strong> The AI needs action! A clip showing a gunfight, including aiming and movement, provides the most useful data.</span>
          </li>
          <li className="flex items-start">
            <Clock size={16} className="mr-3 mt-1 text-brand-primary flex-shrink-0" />
            <span><strong>Keep it Short:</strong> This tool is optimized for short clips (under 2 minutes). Longer videos may fail to process due to browser limitations.</span>
          </li>
        </ul>
      </div>
      
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
