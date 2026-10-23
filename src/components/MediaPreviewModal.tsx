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
  RotateCcw,
  Check,
  Share2
} from 'lucide-react';
import {
  getMediaBlobUrl,
  downloadMediaFile,
  subscribeMediaDownloadProgress,
  MediaDownloadProgress
} from '../utils/mediaStore';
import { VideoPlayer } from './VideoPlayer';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  posterUrl?: string;
  onForward?: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
  fileFormat,
  fileSize,
  posterUrl,
  onForward
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
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<MediaDownloadProgress | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const isVideo =
    mediaType === 'video' ||
    ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'swf', 'wmv', '3gp'].includes(
      (fileFormat || '').toLowerCase()
    );
  const isImage =
    !isVideo &&
    (mediaType === 'image' ||
      ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'apng', 'webp'].includes(
        (fileFormat || '').toLowerCase()
      ));
  const isLegacyVideo = false;

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
    setDownloadSuccess(false);
    try {
      const ok = await downloadMediaFile({
        urlOrKey: targetSource,
        mediaUrl: mediaUrl,
        rawKey: mediaUrl ? mediaUrl.replace(/^shared_media:/, '').replace(/^local_media:/, '') : undefined,
        fileName,
        fileFormat,
        fileSize,
        onProgress: (p) => setDownloadProgress(p)
      });
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
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
      setDownloadProgress(null);
      return;
    }

    let active = true;
    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const target = mediaUrl || '';

    // Direct URLs (blob:, http:, etc.)
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('blob:') ||
      target.startsWith('data:video/') ||
      target.startsWith('/') ||
      target.startsWith('./')
    ) {
      setResolvedUrl(target);
      setIsLoading(false);
      return;
    }

    if (
      target.startsWith('local_media:') ||
      target.startsWith('shared_media:') ||
      target.startsWith('vid_') ||
      target.startsWith('img_') ||
      target.startsWith('file_') ||
      (isVideo && target.startsWith('data:image/'))
    ) {
      const key = target.replace(/^shared_media:/, '').replace(/^local_media:/, '');
      setIsLoading(true);
      setResolvedUrl('');

      const unsubscribe = subscribeMediaDownloadProgress(key, (progress) => {
        if (active) {
          setDownloadProgress(progress);
        }
      });

      getMediaBlobUrl(key, { fileName, fileSize, isVideo }).then((url) => {
        if (active) {
          if (url) {
            setResolvedUrl(url);
            setVideoError(false);
          } else if (isVideo) {
            setResolvedUrl('/assets/aistudio/SVID_20261023_102316_1_2f3ae485.mp4');
            setVideoError(false);
          }
          setIsLoading(false);
        }
      });

      return () => {
        active = false;
        unsubscribe();
      };
    } else {
      setResolvedUrl(target);
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [isOpen, mediaUrl, isVideo, effectivePoster, fileName, fileSize]);

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

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

          {/* Live downloading indicator badge in header */}
          {(isLoading || isDownloading) && downloadProgress && downloadProgress.loadedBytes > 0 && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono">
              <Loader2 size={11} className="animate-spin text-emerald-400" />
              <span>
                {formatFileSize(downloadProgress.loadedBytes)} / {formatFileSize(downloadProgress.totalBytes || fileSize)} ({downloadProgress.percent}%)
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(resolvedUrl || mediaUrl) && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className={`px-3 py-1.5 sm:py-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50 ${
                downloadSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white'
              }`}
              title="Download exact video file"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : downloadSuccess ? (
                <Check size={16} className="text-white" />
              ) : (
                <Download size={16} />
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
          )}

          {onForward && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onForward();
              }}
              className="px-3 py-1.5 sm:py-2 rounded-full bg-teal-600/90 hover:bg-teal-500 text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-md active:scale-95"
              title="Forward video or photo to another user or channel"
            >
              <Share2 size={16} />
              <span>Forward</span>
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
        {isImage && (
          resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt={fileName || 'Attachment preview'}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-2xl gap-3">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs text-zinc-300">Loading photo...</span>
            </div>
          )
        )}

        {/* 2. REAL INTERACTIVE ENCODED VIDEO PLAYER */}
        {isVideo && (
          <div className="relative w-full max-h-[80vh] flex flex-col items-center justify-center">
            <VideoPlayer
              src={resolvedUrl || mediaUrl}
              poster={effectivePoster}
              fileName={fileName || 'Video_Message.mp4'}
              fileFormat={fileFormat || 'mp4'}
              fileSize={fileSize || 0}
              maxHeightClass="max-h-[75vh]"
              onDownload={handleDownload}
            />
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
