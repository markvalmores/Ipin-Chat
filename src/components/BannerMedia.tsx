import React from 'react';
import { extractYouTubeId, getYouTubeBannerEmbedUrl } from '../utils/youtube';

interface BannerMediaProps {
  bannerURL?: string;
  bannerType?: 'image' | 'video' | 'youtube';
  className?: string;
}

export const BannerMedia: React.FC<BannerMediaProps> = ({
  bannerURL,
  bannerType,
  className = 'w-full h-full'
}) => {
  if (!bannerURL) {
    return (
      <div className={`${className} bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900`} />
    );
  }

  const youTubeId = extractYouTubeId(bannerURL);

  // 1. YouTube Auto-Looping Video Banner
  if (youTubeId || bannerType === 'youtube') {
    const id = youTubeId || bannerURL;
    return (
      <div className={`relative ${className} overflow-hidden bg-black select-none pointer-events-none`}>
        <iframe
          src={getYouTubeBannerEmbedUrl(id)}
          className="absolute top-1/2 left-1/2 w-[170%] h-[170%] -translate-x-1/2 -translate-y-1/2 object-cover border-0 pointer-events-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
          title="YouTube Video Banner"
        />
        {/* Subtle overlay to blend nicely with messenger styling */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
      </div>
    );
  }

  // 2. Direct MP4 Video Banner
  const isMp4 =
    bannerType === 'video' ||
    bannerURL.endsWith('.mp4') ||
    bannerURL.includes('.mp4?') ||
    bannerURL.startsWith('data:video/');

  if (isMp4) {
    return (
      <div className={`relative ${className} overflow-hidden bg-black`}>
        <video
          src={bannerURL}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
      </div>
    );
  }

  // 3. Image Banner (PNG, JPG, GIF)
  return (
    <div className={`relative ${className} overflow-hidden`}>
      <img
        src={bannerURL}
        alt="Profile Banner"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
};
