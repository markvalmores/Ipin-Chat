import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  RotateCcw,
  Sparkles,
  Settings,
  Film,
  Info,
  Check,
  Zap,
  Loader2,
  Sliders,
  PictureInPicture
} from 'lucide-react';
import {
  formatTime,
  formatBytes,
  encodeVideoBlob,
  EncodedVideoResult,
  getResolutionLabel
} from '../utils/videoEncoder';
import { downloadMediaFile } from '../utils/mediaStore';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  autoPlay?: boolean;
  className?: string;
  maxHeightClass?: string; // e.g. "max-h-72" or "max-h-[80vh]"
  onDownload?: () => void;
  showEncoderBadge?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  fileName = 'Encoded_Video.mp4',
  fileFormat = 'mp4',
  fileSize = 0,
  autoPlay = false,
  className = '',
  maxHeightClass = 'max-h-80',
  onDownload,
  showEncoderBadge = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // Hover & Tooltip state for scrubber
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Encoder API States
  const [activeSrc, setActiveSrc] = useState<string>(src);
  const [activePoster, setActivePoster] = useState<string | undefined>(poster);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [encodingPhase, setEncodingPhase] = useState('');
  const [encodedResult, setEncodedResult] = useState<EncodedVideoResult | null>(null);
  const [showEncoderModal, setShowEncoderModal] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setActiveSrc(src);
    setActivePoster(poster);
    setVideoError(false);
  }, [src, poster]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered && video.buffered.length > 0) {
      try {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      } catch (e) {}
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    setVideoError(false);
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      try {
        await video.play();
        setIsPlaying(true);
        setHasPlayedOnce(true);
        setVideoError(false);
      } catch (err) {
        // Fallback with mute if browser blocks unmuted play
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
          setHasPlayedOnce(true);
          setVideoError(false);
        } catch (innerErr) {
          console.error('Video play error:', innerErr);
          setVideoError(true);
        }
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || !duration) return;

    const rect = timeline.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;

    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    if (!timeline || !duration) return;

    const rect = timeline.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    setVolume(newVol);
    if (video) {
      video.volume = newVol;
      if (newVol === 0) {
        video.muted = true;
        setIsMuted(true);
      } else {
        video.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      if (volume === 0) setVolume(1.0);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (videoRef.current) {
      videoRef.current.loop = next;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  // Trigger Video Encoder API On-Demand
  const handleReEncodeVideo = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isEncoding || !activeSrc) return;

    setIsEncoding(true);
    setEncodingProgress(0);
    setEncodingPhase('Starting Video Encoder Pipeline...');

    try {
      // Fetch source blob
      let sourceBlob: Blob;
      if (activeSrc.startsWith('data:')) {
        const res = await fetch(activeSrc);
        sourceBlob = await res.blob();
      } else {
        const res = await fetch(activeSrc);
        sourceBlob = await res.blob();
      }

      const result = await encodeVideoBlob(sourceBlob, {
        targetFormat: 'auto',
        maxDimension: 1280, // 720p HD optimized
        videoBitrate: 1800000,
        onProgress: (percent, phase) => {
          setEncodingProgress(percent);
          setEncodingPhase(phase);
        }
      });

      setEncodedResult(result);
      setActiveSrc(result.url);
      if (result.posterUrl) {
        setActivePoster(result.posterUrl);
      }

      if (videoRef.current) {
        videoRef.current.src = result.url;
        videoRef.current.load();
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } catch (err) {
      console.error('Re-encode error:', err);
    } finally {
      setIsEncoding(false);
    }
  };

  // 1-Click Download
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
      return;
    }
    downloadMediaFile({
      urlOrKey: activeSrc,
      mediaUrl: activeSrc,
      fileName,
      fileFormat,
      fileSize: encodedResult?.size || fileSize
    });
  };

  const formattedName = fileName.replace(/\.[^/.]+$/, '');
  const resolutionText = encodedResult?.resolutionLabel || getResolutionLabel(videoRef.current?.videoHeight || 720);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      className={`relative group/player rounded-2xl overflow-hidden bg-zinc-950 select-none shadow-xl border border-zinc-800/80 ${className}`}
    >
      {/* Video Media Canvas */}
      <div className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={activeSrc}
          poster={activePoster}
          playsInline
          loop={isLooping}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setVideoError(true)}
          className={`w-full h-full object-contain ${maxHeightClass}`}
        />

        {/* Video Encoder Processing Overlay */}
        {isEncoding && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
              <Zap size={28} className="text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-bold text-emerald-300 mb-1">
              Video Encoder API Active
            </h4>
            <p className="text-xs text-zinc-300 max-w-xs mb-3">
              {encodingPhase || 'Transcoding video frames into H.264/WebM...'}
            </p>

            {/* Encoding Progress Bar */}
            <div className="w-full max-w-xs bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700 mb-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${encodingProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{encodingProgress}%</span>
          </div>
        )}

        {/* Error Fallback Box */}
        {videoError && !isEncoding && (
          <div className="absolute inset-0 z-20 bg-zinc-900/90 text-white flex flex-col items-center justify-center p-4 text-center">
            <Film size={32} className="text-emerald-400 mb-2" />
            <p className="text-xs font-semibold">{fileName}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 mb-3">
              {formatBytes(fileSize || 1024 * 1024)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReEncodeVideo}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Zap size={14} />
                <span>⚡ Re-Encode Video</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadClick}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                <Download size={13} />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {/* Center Play Button Overlay (when paused) */}
        {!isPlaying && !isEncoding && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50 backdrop-blur-xs transform hover:scale-110 active:scale-95 transition-all">
              <Play size={26} className="ml-1" />
            </div>
          </div>
        )}

        {/* Top Badges (Format Tag & Video Encoder Badge) */}
        {showEncoderBadge && (
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            {/* Encoder Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEncoderModal(true);
              }}
              className="pointer-events-auto px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 font-medium text-[10px] flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Zap size={12} className="text-emerald-400" />
              <span>{encodedResult ? 'Encoded (H.264/WebM)' : '⚡ Video Encoder API'}</span>
              <span className="px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 text-[9px] font-mono">
                {resolutionText}
              </span>
            </button>

            {/* Quick Format Badge */}
            <div className="px-2 py-0.5 rounded-lg bg-black/60 text-[10px] text-zinc-300 font-mono uppercase backdrop-blur-xs">
              {fileFormat.toUpperCase() || 'MP4'}
            </div>
          </div>
        )}
      </div>

      {/* Modern Player Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Timeline Bar */}
        <div
          ref={timelineRef}
          onClick={handleScrub}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative h-3 w-full flex items-center cursor-pointer group/scrub"
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 shadow-md pointer-events-none"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Track Background */}
          <div className="h-1.5 w-full bg-zinc-700/80 rounded-full overflow-hidden relative group-hover/scrub:h-2 transition-all">
            {/* Buffer Progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-zinc-500/50 transition-all"
              style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
            />
            {/* Current Played Progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Scrubber Handle Knob */}
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-white ring-2 ring-emerald-500 shadow-md -translate-x-1/2 opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Buttons & Time Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
            </button>

            {/* Volume Control Slider */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 h-1 bg-zinc-700 accent-emerald-500 rounded-lg cursor-pointer transition-all"
              />
            </div>

            {/* Elapsed / Duration Time */}
            <span className="font-mono text-[11px] text-zinc-300 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Encoder Action, Speed, Loop, PiP, Fullscreen, Download */}
          <div className="flex items-center gap-1.5 relative">
            {/* Re-Encode Action */}
            <button
              type="button"
              onClick={handleReEncodeVideo}
              disabled={isEncoding}
              className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title="Re-encode and optimize video using Video Encoder API"
            >
              <Zap size={12} className="text-emerald-400" />
              <span className="hidden sm:inline">Encoder</span>
            </button>

            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-30 min-w-[80px]">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeSpeed(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono text-left flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer ${
                        playbackSpeed === s ? 'text-emerald-400 font-bold bg-emerald-950/40' : 'text-zinc-300'
                      }`}
                    >
                      <span>{s}x</span>
                      {playbackSpeed === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={toggleLoop}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLooping ? 'bg-emerald-600 text-white' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title={isLooping ? 'Looping enabled' : 'Enable loop'}
            >
              <RotateCcw size={15} />
            </button>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <PictureInPicture size={15} />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>

            {/* Download Exact Video File */}
            <button
              type="button"
              onClick={handleDownloadClick}
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Download Encoded Video"
            >
              <Download size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Video Encoder API Detailed Specs Modal */}
      {showEncoderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Video Encoder Specs</h4>
                  <p className="text-[10px] text-emerald-400 font-mono">Cross-Device Playback Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEncoderModal(false)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-xl bg-zinc-800/80">
                <span className="text-zinc-400">Resolution</span>
                <span className="text-emerald-300 font-bold">{resolutionText}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-zinc-800/80">
                <span className="text-zinc-400">Codec & Mime</span>
                <span className="text-zinc-200">{encodedResult?.codec || 'H.264 / VP8 / WebM'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-zinc-800/80">
                <span className="text-zinc-400">Duration</span>
                <span className="text-zinc-200">{formatTime(duration)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-zinc-800/80">
                <span className="text-zinc-400">File Size</span>
                <span className="text-zinc-200">{formatBytes(encodedResult?.size || fileSize)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-zinc-800/80">
                <span className="text-zinc-400">Encoder Pipeline</span>
                <span className="text-emerald-400 font-bold">Client Canvas + MediaRecorder</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEncoderModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowEncoderModal(false);
                  handleReEncodeVideo(e);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Zap size={14} />
                <span>Re-Encode Video</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
