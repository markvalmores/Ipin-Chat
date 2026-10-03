/**
 * YouTube URL parser and loop embed helper for ipin Messenger Profile Banner
 */

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return Boolean(extractYouTubeId(url));
}

export function getYouTubeBannerEmbedUrl(videoId: string): string {
  // Autoplay, Mute, Loop, Hide controls, disable related videos
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0`;
}
