import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { VideoState } from '../types';

interface VideoPlayerProps {
  src: string | null;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  captureFrame: () => string | null;
  videoElement: HTMLVideoElement | null;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({ src, onTimeUpdate, onDurationChange, onEnded }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seekTo: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    videoElement: videoRef.current,
    captureFrame: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;

      // Match canvas size to video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert to JPEG base64
      return canvas.toDataURL('image/jpeg', 0.8); 
    }
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate(video.currentTime);
    const handleDurationChange = () => onDurationChange(video.duration);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', onEnded);
    };
  }, [onTimeUpdate, onDurationChange, onEnded]);

  if (!src) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
        <p>No video loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        controls={false}
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;