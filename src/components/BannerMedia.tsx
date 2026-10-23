import React, { useState, useEffect } from 'react';
import { extractYouTubeId, getYouTubeBannerEmbedUrl } from '../utils/youtube';
import { getMediaBlobUrl } from '../utils/mediaStore';

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
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [videoFallbackUrl, setVideoFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setVideoFallbackUrl(null);
    if (
      bannerURL?.startsWith('local_mp4:') ||
      bannerURL?.startsWith('shared_media:') ||
      bannerURL?.startsWith('local_media:')
    ) {
      const key = bannerURL.replace(/^local_mp4:/, '');
      getMediaBlobUrl(key, { isVideo: true }).then((url) => {
        if (active && url) {
          setResolvedBlobUrl(url);
        }
      });
    } else if (bannerURL?.includes('assets.mixkit.co')) {
      setResolvedBlobUrl('/videos/california_redwoods_breeze.mp4');
    } else {
      setResolvedBlobUrl(null);
    }
    return () => {
      active = false;
    };
  }, [bannerURL]);

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

  // 2. Direct MP4 Video Banner (Device MP4 upload, blob URL, or MP4 URL)
  const effectiveVideoUrl =
    videoFallbackUrl ||
    resolvedBlobUrl ||
    (bannerURL.startsWith('blob:') ? bannerURL : null) ||
    (bannerType === 'video' ||
    bannerURL.endsWith('.mp4') ||
    bannerURL.includes('.mp4?') ||
    bannerURL.startsWith('data:video/')
      ? bannerURL
      : null);

  if (effectiveVideoUrl) {
    return (
      <div className={`relative ${className} overflow-hidden bg-black`}>
        <video
          key={effectiveVideoUrl}
          src={effectiveVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={() => {
            if (effectiveVideoUrl !== '/videos/california_redwoods_breeze.mp4') {
              setVideoFallbackUrl('/videos/california_redwoods_breeze.mp4');
            }
          }}
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
