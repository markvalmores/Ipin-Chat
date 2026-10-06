import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Play,
  Pause,
  Film,
  Loader2,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw
} from 'lucide-react';
import { getMediaBlobUrl, downloadMediaFile } from '../utils/mediaStore';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  posterUrl?: string;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
  fileFormat,
  fileSize,
  posterUrl
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const isVideo =
    mediaType === 'video' ||
    ['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes((fileFormat || '').toLowerCase());
  const isImage =
    mediaType === 'image' ||
    ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'apng', 'webp'].includes((fileFormat || '').toLowerCase());
  const isLegacyVideo = ['avi', 'flv', 'swf', 'wmv'].includes((fileFormat || '').toLowerCase());

  // Determine effective poster
  const effectivePoster =
    posterUrl ||
    (mediaUrl && mediaUrl.startsWith('data:image/') ? mediaUrl : undefined);

  // Download exact video/media file
  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const targetSource = resolvedUrl || mediaUrl;
    if (!targetSource || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadMediaFile({
        urlOrKey: targetSource,
        fileName,
        fileFormat,
        fileSize
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset state and resolve URL whenever modal opens or mediaUrl changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setVideoError(false);
      return;
    }

    let active = true;
    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const target = mediaUrl || '';

    if (target.startsWith('local_media:') || target.startsWith('vid_')) {
      const key = target.replace('local_media:', '');
      setIsLoading(true);
      setResolvedUrl(''); // Do not set raw key as video src to avoid HTML5 video crash

      getMediaBlobUrl(key).then((url) => {
        if (active) {
          if (url) {
            setResolvedUrl(url);
            setVideoError(false);
          } else {
            console.warn('Could not resolve media blob for key:', key);
            // If we have a poster, we can still show the poster frame
            if (!effectivePoster) {
              setVideoError(true);
            }
          }
          setIsLoading(false);
        }
      });
    } else if (target.startsWith('data:image/')) {
      // If mediaUrl was passed as poster dataUrl, check if it's an image or video
      if (isVideo) {
        setResolvedUrl('');
        setIsLoading(false);
      } else {
        setResolvedUrl(target);
        setIsLoading(false);
      }
    } else {
      setResolvedUrl(target);
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [isOpen, mediaUrl, isVideo]);

  // Handle play/pause toggle with resilient fallback
  const handleTogglePlay = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      // If src is missing on element, set it
      if (!video.src && resolvedUrl) {
        video.src = resolvedUrl;
      }

      try {
        await video.play();
        setIsPlaying(true);
        setVideoError(false);
      } catch (err: any) {
        console.warn('Playback blocked or failed, retrying with muted sound:', err);
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
          setVideoError(false);
        } catch (innerErr) {
          console.error('Final video play error:', innerErr);
        }
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      videoRef.current.requestFullscreen?.();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const playableVideoSrc =
    resolvedUrl &&
    !resolvedUrl.startsWith('data:image/') &&
    !resolvedUrl.startsWith('local_media:') &&
    !resolvedUrl.startsWith('vid_')
      ? resolvedUrl
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
      onMouseMove={handleMouseMove}
    >
      {/* Top action bar */}
      <div
        className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-30 flex items-center justify-between text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 max-w-[65%]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-[11px] font-bold uppercase tracking-wider shadow-sm">
            {fileFormat || mediaType || 'VIDEO'}
          </span>
          <p className="text-xs sm:text-sm font-semibold truncate drop-shadow-md">
            {fileName || (isVideo ? 'Video Preview' : 'Media Attachment')}
          </p>
          {fileSize ? (
            <span className="hidden sm:inline text-xs text-zinc-400">({formatFileSize(fileSize)})</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {(playableVideoSrc || resolvedUrl || mediaUrl) && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-1.5 sm:py-2 rounded-full bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
              title="Download exact video file"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Download size={16} />
              )}
              <span>{isDownloading ? 'Saving...' : 'Download'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center p-1 sm:p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. PHOTO LIGHTBOX */}
        {isImage && resolvedUrl && (
          <img
            src={resolvedUrl}
            alt={fileName || 'Attachment preview'}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
          />
        )}

        {/* 2. REAL INTERACTIVE VIDEO PLAYER */}
        {isVideo && !isLegacyVideo && (
          <div className="relative w-full max-h-[80vh] flex flex-col items-center justify-center">
            {videoError && !playableVideoSrc ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center flex flex-col items-center gap-4 text-white shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Film size={36} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold">{fileName || 'Video Stream'}</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Format: <span className="uppercase text-emerald-400 font-semibold">{fileFormat || 'MP4'}</span>
                    {fileSize ? ` • ${formatFileSize(fileSize)}` : ''}
                  </p>
                  <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
                    Connecting to local video cache... Tap below to reload stream or download.
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(false);
                      setIsLoading(true);
                      if (mediaUrl) {
                        const key = mediaUrl.replace('local_media:', '');
                        getMediaBlobUrl(key).then((url) => {
                          if (url) setResolvedUrl(url);
                          setIsLoading(false);
                        });
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    <span>Retry Video Stream</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 size={14} className="animate-spin text-emerald-400" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{isDownloading ? 'Saving Exact File...' : 'Download Video File'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-h-[80vh] flex items-center justify-center group/player overflow-hidden rounded-2xl bg-black shadow-2xl">
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  src={playableVideoSrc}
                  poster={effectivePoster}
                  playsInline
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  onError={() => {
                    if (playableVideoSrc) {
                      setVideoError(true);
                    }
                  }}
                  onClick={handleTogglePlay}
                  className="max-w-full max-h-[80vh] object-contain cursor-pointer"
                />

                {/* Big Center Interactive Play Button when paused */}
                {!isPlaying && !isLoading && (
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-emerald-600/95 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-110 transition-all cursor-pointer z-20 group/btn"
                    title="Play Video"
                    aria-label="Play Video"
                  >
                    <Play size={38} fill="currentColor" className="ml-1 text-white group-hover/btn:scale-105 transition-transform" />
                  </button>
                )}

                {/* Spinner when loading video stream */}
                {isLoading && (
                  <div className="absolute inset-0 m-auto w-24 h-24 rounded-3xl bg-black/80 border border-zinc-800 text-emerald-400 flex flex-col items-center justify-center gap-2 shadow-2xl z-20">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-[11px] font-semibold text-zinc-300">Loading stream</span>
                  </div>
                )}

                {/* Bottom Custom Overlay Controls Bar */}
                <div
                  className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 z-10 flex flex-col gap-2 ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Timeline Scrubber */}
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2 transition-all"
                    />
                  </div>

                  {/* Playback action row */}
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX size={18} className="text-amber-400" /> : <Volume2 size={18} />}
                      </button>

                      <span className="text-[11px] text-zinc-300 font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Download exact video file"
                      >
                        {isDownloading ? (
                          <Loader2 size={16} className="animate-spin text-emerald-400" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Fullscreen"
                      >
                        <Maximize size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. LEGACY / EXTENDED VIDEO FORMATS (AVI, FLV, SWF) */}
        {isLegacyVideo && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4 text-white shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl font-black">
              <Film size={40} />
            </div>
            <div>
              <h4 className="text-lg font-bold">{fileName || 'Media Stream File'}</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Format: <span className="uppercase text-emerald-400 font-semibold">{fileFormat}</span> • {formatFileSize(fileSize)}
              </p>
              <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
                ipin Messenger successfully relayed this video payload across the global China bridge. You can download and open it in any desktop or native media player (VLC, PotPlayer).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isDownloading ? 'Saving Exact File...' : `Download & Play ${fileFormat?.toUpperCase() || 'Video'}`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
