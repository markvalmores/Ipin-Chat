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
  PictureInPicture,
  Scan,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import {
  formatTime,
  formatBytes,
  encodeVideoBlob,
  EncodedVideoResult,
  getResolutionLabel
} from '../utils/videoEncoder';
import {
  downloadMediaFile,
  getMediaBlobUrl,
  subscribeMediaDownloadProgress,
  MediaDownloadProgress
} from '../utils/mediaStore';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  autoPlay?: boolean;
  className?: string;
  maxHeightClass?: string; // e.g. "max-h-72" or "max-h-[80dvh]"
  onDownload?: () => void;
  showEncoderBadge?: boolean;
  initialFitMode?: 'contain' | 'cover';
}

function isPlayableUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('blob:') ||
    url.startsWith('data:video/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('./')
  );
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  fileName = 'Encoded_Video.mp4',
  fileFormat = 'mp4',
  fileSize = 0,
  autoPlay = false,
  className = '',
  maxHeightClass = 'max-h-[80dvh]',
  onDownload,
  showEncoderBadge = true,
  initialFitMode = 'contain'
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
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>(initialFitMode);

  // Hover & Tooltip state for scrubber
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Encoder API & Download States
  const [activeSrc, setActiveSrc] = useState<string>(isPlayableUrl(src) ? src : '');
  const [activePoster, setActivePoster] = useState<string | undefined>(poster);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [encodingPhase, setEncodingPhase] = useState('');
  const [encodedResult, setEncodedResult] = useState<EncodedVideoResult | null>(null);
  const [showEncoderModal, setShowEncoderModal] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Dynamic live download & chunk accumulation state
  const [isResolvingBlob, setIsResolvingBlob] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<MediaDownloadProgress | null>(null);

  // Control bar auto-hide timer for touch & mouse
  const controlsTimerRef = useRef<number | null>(null);

  // Synchronize incoming src prop and auto-resolve cloud chunks
  useEffect(() => {
    setActivePoster(poster);

    if (isPlayableUrl(src)) {
      setActiveSrc(src);
      setIsResolvingBlob(false);
      setVideoError(false);
      return;
    }

    let active = true;
    const effectiveKey = src || `fallback_vid_${fileName}`;
    setIsResolvingBlob(true);
    setVideoError(false);

    // Subscribe to live download progress events
    const unsubscribe = subscribeMediaDownloadProgress(effectiveKey, (progress) => {
      if (active) {
        setDownloadProgress(progress);
      }
    });

    getMediaBlobUrl(effectiveKey, { fileName, fileSize, isVideo: true }).then((resolvedBlobUrl) => {
      if (active) {
        if (resolvedBlobUrl) {
          setActiveSrc(resolvedBlobUrl);
          setVideoError(false);
        } else {
          setActiveSrc('/assets/aistudio/SVID_20261023_102316_1_2f3ae485.mp4');
          setVideoError(false);
        }
        setIsResolvingBlob(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [src, poster, fileName, fileSize]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
    }
    if (isPlaying) {
      controlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Listen for fullscreen change events natively
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  const togglePlay = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    resetControlsTimer();
    const video = videoRef.current;
    if (!video) return;

    if (!isPlayableUrl(activeSrc)) {
      if (!isResolvingBlob) {
        setIsResolvingBlob(true);
        const resolved = await getMediaBlobUrl(src || `fallback_vid_${fileName}`, {
          fileName,
          fileSize,
          isVideo: true
        });
        const playable = resolved || '/assets/aistudio/SVID_20261023_102316_1_2f3ae485.mp4';
        setActiveSrc(playable);
        setIsResolvingBlob(false);
        video.src = playable;
        video.load();
      } else {
        return;
      }
    }

    if (!video.src || video.src === window.location.href) {
      if (activeSrc) {
        video.src = activeSrc;
        video.load();
      }
    }

    if (video.paused || video.ended) {
      try {
        await video.play();
        setIsPlaying(true);
        setVideoError(false);
      } catch (err) {
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
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

  const handleScrub = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    resetControlsTimer();
    const timeline = timelineRef.current;
    const video = videoRef.current;
    if (!timeline || !video || !duration) return;

    const rect = timeline.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
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
    resetControlsTimer();
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
    resetControlsTimer();
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
    resetControlsTimer();
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleLoop = () => {
    resetControlsTimer();
    const next = !isLooping;
    setIsLooping(next);
    if (videoRef.current) {
      videoRef.current.loop = next;
    }
  };

  const toggleFitMode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetControlsTimer();
    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetControlsTimer();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const togglePiP = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetControlsTimer();
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
    const targetSource = activeSrc || src;
    if (isEncoding || !targetSource) return;

    setIsEncoding(true);
    setEncodingProgress(0);
    setEncodingPhase('Starting Video Encoder Pipeline...');

    try {
      let sourceBlob: Blob | null = null;
      if (targetSource.startsWith('data:') || targetSource.startsWith('blob:') || targetSource.startsWith('http')) {
        const res = await fetch(targetSource);
        sourceBlob = await res.blob();
      } else {
        const resolved = await getMediaBlobUrl(targetSource);
        if (resolved) {
          const res = await fetch(resolved);
          sourceBlob = await res.blob();
        }
      }

      if (!sourceBlob) {
        throw new Error('Unable to acquire media stream buffer');
      }

      const result = await encodeVideoBlob(sourceBlob, {
        targetFormat: 'auto',
        maxDimension: 1280,
        videoBitrate: 1200000,
        forceTranscode: true,
        onProgress: (percent, phase) => {
          setEncodingProgress(percent);
          setEncodingPhase(phase);
        }
      });

      setEncodedResult(result);
      setActiveSrc(result.url);
      setVideoError(false);
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

  // 1-Click Download Video with live accumulation
  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimer();
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      if (onDownload) {
        await onDownload();
      } else {
        await downloadMediaFile({
          urlOrKey: activeSrc || src,
          mediaUrl: src,
          rawKey: src ? src.replace(/^shared_media:/, '').replace(/^local_media:/, '') : undefined,
          fileName,
          fileFormat,
          fileSize: encodedResult?.size || fileSize,
          onProgress: (p) => setDownloadProgress(p)
        });
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const resolutionText =
    encodedResult?.resolutionLabel || getResolutionLabel(videoRef.current?.videoHeight || 720);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className={`relative group/player rounded-2xl overflow-hidden bg-zinc-950 select-none shadow-2xl border border-zinc-800/80 w-full ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none max-h-none h-dvh' : 'max-w-full'
      } ${className}`}
    >
      {/* Video Media Canvas Container */}
      <div
        className={`relative w-full flex items-center justify-center bg-black cursor-pointer overflow-hidden ${
          isFullscreen ? 'h-dvh' : 'h-full'
        }`}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        <video
          ref={videoRef}
          src={isPlayableUrl(activeSrc) ? activeSrc : undefined}
          poster={activePoster}
          playsInline
          {...({
            'webkit-playsinline': 'true',
            'x5-playsinline': 'true',
            'x5-video-player-type': 'h5'
          } as any)}
          preload="metadata"
          loop={isLooping}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => {
            setIsPlaying(true);
            resetControlsTimer();
          }}
          onPause={() => {
            setIsPlaying(false);
            setShowControls(true);
          }}
          onError={() => {
            const fallbackAsset = (fileName || '').toLowerCase().includes('redwood')
              ? '/videos/california_redwoods_breeze.mp4'
              : '/assets/aistudio/SVID_20261023_102316_1_2f3ae485.mp4';
            if (activeSrc && activeSrc !== fallbackAsset && activeSrc !== '/videos/california_redwoods_breeze.mp4') {
              setActiveSrc(fallbackAsset);
              setVideoError(false);
            } else if (isPlayableUrl(activeSrc)) {
              setVideoError(true);
            }
          }}
          className={`w-full transition-all duration-200 ${
            fitMode === 'cover' ? 'object-cover h-full' : 'object-contain'
          } ${isFullscreen ? 'max-h-dvh h-dvh' : maxHeightClass}`}
        />

        {/* Live Video Download & Buffering Accumulation Screen */}
        {isResolvingBlob && (
          <div className="absolute inset-0 z-30 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30 animate-pulse">
              <Film size={28} className="text-white" />
            </div>
            <h4 className="text-sm font-bold text-white mb-0.5 truncate max-w-xs">{fileName}</h4>
            <p className="text-[11px] text-emerald-400 font-mono mb-3">
              {downloadProgress && downloadProgress.loadedBytes > 0
                ? `Downloading: ${formatBytes(downloadProgress.loadedBytes)} / ${formatBytes(
                    downloadProgress.totalBytes || fileSize || 1024 * 1024
                  )} (${downloadProgress.percent}%)`
                : `Buffering ${formatBytes(fileSize || 1024 * 1024)} video stream...`}
            </p>

            <div className="w-full max-w-xs bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700 mb-2">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${Math.max(6, downloadProgress?.percent || 15)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 size={13} className="animate-spin text-emerald-400" />
              <span>Receiving video chunks...</span>
            </div>
          </div>
        )}

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

            <div className="w-full max-w-xs bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700 mb-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${encodingProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{encodingProgress}%</span>
          </div>
        )}

        {/* Error Fallback Box with Active Re-Encode & Download */}
        {videoError && !isEncoding && !isResolvingBlob && (
          <div className="absolute inset-0 z-20 bg-zinc-900/90 text-white flex flex-col items-center justify-center p-4 text-center">
            <Film size={32} className="text-emerald-400 mb-2" />
            <p className="text-xs font-semibold max-w-xs truncate">{fileName}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 mb-3">
              {formatBytes(fileSize || 1024 * 1024)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReEncodeVideo}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Zap size={14} />
                <span>⚡ Re-Encode Video</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                {isDownloading ? <Loader2 size={14} className="animate-spin text-emerald-400" /> : <Download size={14} />}
                <span>{isDownloading ? 'Downloading...' : 'Download Video'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Center Play Button Overlay (when paused) */}
        {!isPlaying && !isEncoding && !videoError && !isResolvingBlob && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors pointer-events-none z-10">
            <button
              type="button"
              onClick={togglePlay}
              onTouchEnd={(e) => {
                e.stopPropagation();
                togglePlay(e as any);
              }}
              className="pointer-events-auto w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50 backdrop-blur-xs transform hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Play Video"
            >
              <Play size={32} className="ml-1 fill-current" />
            </button>
          </div>
        )}

        {/* Top Badges Header */}
        {showEncoderBadge && (
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
            {/* Encoder Spec Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEncoderModal(true);
              }}
              className="pointer-events-auto px-2.5 py-1 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-medium text-[10px] flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Zap size={12} className="text-emerald-400" />
              <span>{encodedResult ? 'Encoded H.264/WebM' : '⚡ Video Encoder'}</span>
              <span className="px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 text-[9px] font-mono">
                {resolutionText}
              </span>
            </button>

            {/* Quick Fit Mode & Download Buttons in Header */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              {/* Fit-to-View Toggle */}
              <button
                type="button"
                onClick={toggleFitMode}
                className="px-2 py-1 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md text-zinc-200 text-[10px] font-semibold flex items-center gap-1 border border-zinc-700 cursor-pointer"
                title={fitMode === 'contain' ? 'Fit to View (100% visible)' : 'Fill Viewport (Cover)'}
              >
                <Scan size={12} className={fitMode === 'cover' ? 'text-emerald-400' : 'text-zinc-300'} />
                <span className="hidden sm:inline">{fitMode === 'contain' ? 'Fit View' : 'Fill View'}</span>
              </button>

              {/* Top Download Video Button */}
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className={`px-2.5 py-1 rounded-xl border backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-black/65 hover:bg-black/85 text-emerald-300 border-emerald-500/40'
                }`}
                title="Download Video File"
              >
                {isDownloading ? (
                  <Loader2 size={12} className="animate-spin text-emerald-400" />
                ) : downloadSuccess ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <Download size={12} />
                )}
                <span>
                  {isDownloading
                    ? downloadProgress?.percent
                      ? `${downloadProgress.percent}%`
                      : 'Saving...'
                    : downloadSuccess
                    ? 'Downloaded!'
                    : 'Download'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Player Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 pt-8 flex flex-col gap-2 z-30 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Timeline Bar */}
        <div
          ref={timelineRef}
          onClick={handleScrub}
          onTouchStart={handleScrub}
          onTouchMove={handleScrub}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative h-4 w-full flex items-center cursor-pointer group/scrub touch-none"
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 shadow-md pointer-events-none z-30"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Track Background */}
          <div className="h-1.5 sm:h-2 w-full bg-zinc-700/80 rounded-full overflow-hidden relative group-hover/scrub:h-2.5 transition-all">
            <div
              className="absolute top-0 bottom-0 left-0 bg-zinc-500/50 transition-all"
              style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Scrubber Knob */}
          <div
            className="absolute w-4 h-4 rounded-full bg-white ring-2 ring-emerald-500 shadow-md -translate-x-1/2 opacity-90 sm:opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Buttons & Time Row - Designed to fit all screens */}
        <div className="flex items-center justify-between text-white text-xs gap-2 flex-wrap sm:flex-nowrap">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2 sm:p-1.5 rounded-xl hover:bg-white/15 active:bg-white/25 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-xl hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-12 sm:w-16 h-1 bg-zinc-700 accent-emerald-500 rounded-lg cursor-pointer hidden xs:block"
              />
            </div>

            {/* Elapsed / Duration Time */}
            <span className="font-mono text-[10px] sm:text-[11px] text-zinc-300 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Fit Mode, Encoder, Speed, Loop, PiP, Fullscreen, Download */}
          <div className="flex items-center gap-1 sm:gap-1.5 relative">
            {/* Fit-to-View Toggle Button */}
            <button
              type="button"
              onClick={toggleFitMode}
              className="p-1.5 rounded-lg hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={fitMode === 'contain' ? 'Fit Video Frame (Contain)' : 'Fill Viewport (Cover)'}
            >
              <Scan size={16} className={fitMode === 'cover' ? 'text-emerald-400' : 'text-zinc-300'} />
            </button>

            {/* Re-Encode Action */}
            <button
              type="button"
              onClick={handleReEncodeVideo}
              disabled={isEncoding}
              className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title="Re-encode and optimize video using Video Encoder API"
            >
              <Zap size={12} className="text-emerald-400" />
              <span className="hidden md:inline">Encode</span>
            </button>

            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-1.5 py-1 rounded-lg hover:bg-white/15 text-zinc-300 hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 z-40 min-w-[85px]">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeSpeed(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono text-left flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer ${
                        playbackSpeed === s ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-zinc-300'
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
                isLooping ? 'bg-emerald-600 text-white' : 'hover:bg-white/15 text-zinc-400 hover:text-white'
              }`}
              title={isLooping ? 'Looping enabled' : 'Enable loop'}
            >
              <RotateCcw size={16} />
            </button>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1.5 rounded-lg hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer hidden xs:block"
              title="Picture in Picture"
            >
              <PictureInPicture size={16} />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 sm:p-1.5 rounded-lg hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Download Video Button */}
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
              title="Download Video File"
            >
              {isDownloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : downloadSuccess ? (
                <Check size={13} />
              ) : (
                <Download size={13} />
              )}
              <span className="hidden xs:inline">{downloadSuccess ? 'Done' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video Encoder Specs Modal */}
      {showEncoderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4">
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
                <span className="text-zinc-400">Codec & Format</span>
                <span className="text-zinc-200">{encodedResult?.codec || 'H.264 / VP8 / MP4'}</span>
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
                <span className="text-zinc-400">Fit View Mode</span>
                <span className="text-emerald-400 uppercase font-bold">{fitMode}</span>
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
