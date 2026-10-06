import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Play, Film } from 'lucide-react';
import { getMediaBlobUrl } from '../utils/mediaStore';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
  fileFormat,
  fileSize
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(mediaUrl);

  useEffect(() => {
    let active = true;
    if (mediaUrl.startsWith('local_media:') || mediaUrl.startsWith('vid_')) {
      const key = mediaUrl.replace('local_media:', '');
      getMediaBlobUrl(key).then((url) => {
        if (active && url) {
          setResolvedUrl(url);
        }
      });
    } else {
      setResolvedUrl(mediaUrl);
    }
    return () => {
      active = false;
    };
  }, [mediaUrl]);

  if (!isOpen) return null;

  const isVideo = mediaType === 'video' || ['mp4', 'webm', 'mov', 'm4v'].includes((fileFormat || '').toLowerCase());
  const isImage = mediaType === 'image' || ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'apng', 'webp'].includes((fileFormat || '').toLowerCase());
  const isLegacyVideo = ['avi', 'flv', 'swf', 'wmv'].includes((fileFormat || '').toLowerCase());
  const isPosterImage = resolvedUrl.startsWith('data:image/');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 max-w-[60%]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-600/80 text-xs font-bold uppercase tracking-wider">
            {fileFormat || mediaType}
          </span>
          <p className="text-sm font-medium truncate drop-shadow-md">
            {fileName || 'Media Attachment'}
          </p>
          {fileSize && (
            <span className="text-xs text-zinc-400">({formatFileSize(fileSize)})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mediaUrl && (
            <a
              href={mediaUrl}
              download={fileName || `ipin-media.${fileFormat || 'dat'}`}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download file"
            >
              <Download size={18} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center p-2">
        {(isImage || (isVideo && isPosterImage)) && !resolvedUrl.startsWith('blob:') && !resolvedUrl.startsWith('data:video/') && (
          <div className="relative">
            <img
              src={resolvedUrl}
              alt={fileName || 'Attachment preview'}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            {isVideo && (
              <div className="absolute inset-0 bg-black/30 rounded-2xl flex flex-col items-center justify-center text-white gap-2">
                <div className="w-16 h-16 rounded-full bg-emerald-600/90 flex items-center justify-center shadow-xl">
                  <Play size={28} fill="currentColor" className="ml-1" />
                </div>
                <span className="text-xs font-semibold bg-black/60 px-3 py-1 rounded-full">
                  {fileName || 'Video File'} • {formatFileSize(fileSize)}
                </span>
              </div>
            )}
          </div>
        )}

        {isVideo && !isLegacyVideo && !isPosterImage && (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl bg-black"
          />
        )}

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
                ipin Messenger successfully relayed this video payload across the global China bridge. You can download and open it in any desktop or native media player (VLC, PotPlayer, Flash standalone).
              </p>
            </div>
            <a
              href={mediaUrl}
              download={fileName || `file.${fileFormat}`}
              className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download size={16} />
              Download & Play {fileFormat?.toUpperCase()}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
