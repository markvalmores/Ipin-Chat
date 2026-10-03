import React, { useState, useEffect } from 'react';
import { extractYouTubeId, getYouTubeBannerEmbedUrl } from '../utils/youtube';
import { getMediaBlobUrl } from '../utils/mediaStore';

interface ChatWallpaperViewProps {
  wallpaperURL?: string | null;
  wallpaperType?: 'image' | 'gif' | 'youtube' | 'video';
  wallpaperOpacity?: number; // 0.1 to 1.0 (default 0.85)
  wallpaperBlur?: number; // 0, 1, 2, 4
}

export const ChatWallpaperView: React.FC<ChatWallpaperViewProps> = ({
  wallpaperURL,
  wallpaperType,
  wallpaperOpacity = 0.85,
  wallpaperBlur = 0
}) => {
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (wallpaperURL?.startsWith('local_mp4:')) {
      const key = wallpaperURL.replace('local_mp4:', '');
      getMediaBlobUrl(key).then((url) => {
        if (active && url) {
          setResolvedBlobUrl(url);
        }
      });
    } else {
      setResolvedBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [wallpaperURL]);

  if (!wallpaperURL) return null;

  const youTubeId = extractYouTubeId(wallpaperURL);
  const isYouTube = Boolean(youTubeId) || wallpaperType === 'youtube';

  const isVideo =
    wallpaperType === 'video' ||
    Boolean(resolvedBlobUrl) ||
    wallpaperURL.endsWith('.mp4') ||
    wallpaperURL.includes('.mp4?') ||
    wallpaperURL.startsWith('blob:') ||
    wallpaperURL.startsWith('data:video/');

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      style={{
        filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
        transform: wallpaperBlur > 0 ? 'scale(1.05)' : undefined // Prevent blur edge clipping
      }}
    >
      {/* 1. YouTube Live Auto-Looping Background Wallpaper (Auto-Zoomed & Cropped to fill chat) */}
      {isYouTube && youTubeId && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black">
          <iframe
            src={getYouTubeBannerEmbedUrl(youTubeId)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[190%] h-[190%] object-cover border-0 pointer-events-none scale-110"
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            title="Chat Background Video"
          />
        </div>
      )}

      {/* 2. Direct MP4 / Video Background */}
      {!isYouTube && isVideo && (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <video
            src={resolvedBlobUrl || wallpaperURL}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      )}

      {/* 3. PNG, JPG, or Animated GIF Background Wallpaper (Auto-Zoomed & Cropped) */}
      {!isYouTube && !isVideo && (
        <img
          src={wallpaperURL}
          alt="Chat Wallpaper"
          className="w-full h-full object-cover object-center pointer-events-none transition-all duration-300"
        />
      )}

      {/* 4. Adaptive Legibility & Highlight Tint Overlay */}
      {/* Ensures text, emojis, and bubbles stay highlighted and easy to read */}
      <div
        className="absolute inset-0 bg-white/60 dark:bg-zinc-950/65 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: Math.max(0.15, 1 - (wallpaperOpacity ?? 0.85) * 0.75)
        }}
      />

      {/* Subtle depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
};
