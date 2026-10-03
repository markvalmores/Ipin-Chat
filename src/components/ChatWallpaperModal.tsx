import React, { useState } from 'react';
import {
  X,
  Image,
  Film,
  Sparkles,
  Upload,
  Check,
  Trash2,
  Sliders,
  Play,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Conversation } from '../types';
import { extractYouTubeId } from '../utils/youtube';
import { ChatWallpaperSettings, updateConversationWallpaper } from '../services/chatService';
import { ChatWallpaperView } from './ChatWallpaperView';

interface ChatWallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentWallpaper: ChatWallpaperSettings | null;
  onWallpaperUpdated: (settings: ChatWallpaperSettings | null) => void;
}

const PRESET_WALLPAPERS = [
  {
    name: 'Cyberpunk Rain (GIF)',
    type: 'gif' as const,
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300'
  },
  {
    name: 'Neon Tokyo Alley (JPG)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300'
  },
  {
    name: 'Mount Fuji Cherry Blossom (JPG)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300'
  },
  {
    name: 'Deep Space Nebula (JPG)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=300'
  },
  {
    name: 'Emerald Aurora (JPG)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300'
  },
  {
    name: 'Lo-Fi Chill Room (YouTube)',
    type: 'youtube' as const,
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300'
  },
  {
    name: 'Tokyo Rain Ambient (YouTube)',
    type: 'youtube' as const,
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    thumb: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=300'
  },
  {
    name: 'Sunset Ocean Waves (YouTube)',
    type: 'youtube' as const,
    url: 'https://www.youtube.com/watch?v=bn9F19Hi1Lk',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300'
  }
];

export const ChatWallpaperModal: React.FC<ChatWallpaperModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentWallpaper,
  onWallpaperUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'youtube' | 'url'>('presets');
  const [previewURL, setPreviewURL] = useState<string>(currentWallpaper?.wallpaperURL || '');
  const [previewType, setPreviewType] = useState<'image' | 'gif' | 'youtube' | 'video'>(
    currentWallpaper?.wallpaperType || 'image'
  );
  const [opacity, setOpacity] = useState<number>(currentWallpaper?.wallpaperOpacity ?? 0.85);
  const [blur, setBlur] = useState<number>(currentWallpaper?.wallpaperBlur ?? 0);
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle local file upload (.png, .jpg, .gif, .mp4)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInputError(null);
    const isGif = file.type === 'image/gif' || file.name.endsWith('.gif');
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewURL(result);
        setPreviewType(isVideo ? 'video' : isGif ? 'gif' : 'image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle YouTube URL submission
  const handleApplyYouTube = () => {
    setInputError(null);
    const id = extractYouTubeId(youtubeInput);
    if (!id) {
      setInputError('Invalid YouTube URL. Please enter a valid YouTube video or shorts link.');
      return;
    }
    setPreviewURL(`https://www.youtube.com/watch?v=${id}`);
    setPreviewType('youtube');
  };

  // Handle direct image / GIF web URL submission
  const handleApplyCustomUrl = () => {
    setInputError(null);
    const url = customUrlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setInputError('Please enter a valid URL starting with https://');
      return;
    }
    const isGif = url.toLowerCase().includes('.gif');
    setPreviewURL(url);
    setPreviewType(isGif ? 'gif' : 'image');
  };

  // Save changes
  const handleSaveWallpaper = async () => {
    setIsSaving(true);
    try {
      const newSettings: ChatWallpaperSettings | null = previewURL
        ? {
            wallpaperURL: previewURL,
            wallpaperType: previewType,
            wallpaperOpacity: opacity,
            wallpaperBlur: blur
          }
        : null;

      await updateConversationWallpaper(conversation.id, newSettings);
      onWallpaperUpdated(newSettings);
      onClose();
    } catch (err) {
      console.error('Failed to update wallpaper:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove wallpaper
  const handleRemoveWallpaper = async () => {
    setIsSaving(true);
    try {
      await updateConversationWallpaper(conversation.id, null);
      onWallpaperUpdated(null);
      onClose();
    } catch (err) {
      console.error('Failed to remove wallpaper:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Image size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Chat Background Wallpaper
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Customize "{conversation.title}" with PNG, JPG, GIF, or looping YouTube video
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Live Preview Card with Mock Chat Bubbles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" />
                Live Preview (Auto-zoomed & Cropped to Fill Chat)
              </span>
              {previewURL && (
                <button
                  type="button"
                  onClick={() => setPreviewURL('')}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Clear Preview
                </button>
              )}
            </div>

            <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner flex flex-col justify-end p-3 bg-zinc-950">
              {/* Wallpaper Layer */}
              <ChatWallpaperView
                wallpaperURL={previewURL}
                wallpaperType={previewType}
                wallpaperOpacity={opacity}
                wallpaperBlur={blur}
              />

              {/* Sample Messages Overlay */}
              <div className="relative z-1 space-y-2 pointer-events-none">
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-3 py-1.5 rounded-2xl rounded-bl-xs bg-white/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 text-xs shadow-md backdrop-blur-xs">
                    👋 Hey! Check out this background wallpaper.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[75%] px-3 py-1.5 rounded-2xl rounded-br-xs bg-emerald-600/90 text-white text-xs shadow-md backdrop-blur-xs">
                    ✨ It fills and highlights the chat nicely!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Curated & GIFs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Upload Device File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'youtube'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              YouTube Video
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Image / GIF URL
            </button>
          </div>

          {/* Tab 1: Presets & Animated GIFs */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_WALLPAPERS.map((preset) => {
                const isSelected = previewURL === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPreviewURL(preset.url);
                      setPreviewType(preset.type);
                    }}
                    className={`group relative h-24 rounded-2xl overflow-hidden border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02]'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50'
                    }`}
                  >
                    <img
                      src={preset.thumb}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                      <span className="text-[10px] font-bold text-white leading-tight truncate">
                        {preset.name}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Upload Device File (.png, .jpg, .gif, .mp4) */}
          {activeTab === 'upload' && (
            <div className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-center transition-colors">
              <input
                type="file"
                id="wallpaper-file-input"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="wallpaper-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Click to browse or drop file here
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Supports PNG, JPG, animated GIF, WebP & MP4 videos
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Tab 3: YouTube Video URL */}
          {activeTab === 'youtube' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  YouTube Video / Shorts Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyYouTube()}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-850 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleApplyYouTube}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                  >
                    Apply YouTube
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Video will be auto-muted, looped, and auto-zoomed to cover the entire chat background seamlessly.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Direct Web Image / GIF URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Direct PNG, JPG, or GIF URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomUrl()}
                    placeholder="https://example.com/wallpaper.gif or .png"
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-850 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {inputError && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
              {inputError}
            </div>
          )}

          {/* Adjustment Sliders (Opacity & Blur) */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-500" />
                Wallpaper Visibility / Opacity
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Background Soft Blur
              </span>
              <div className="flex items-center gap-1">
                {[0, 2, 4].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBlur(b)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                      blur === b
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {b === 0 ? 'Off' : `${b}px`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div>
            {(currentWallpaper?.wallpaperURL || previewURL) && (
              <button
                type="button"
                onClick={handleRemoveWallpaper}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Remove Wallpaper</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveWallpaper}
              disabled={isSaving || !previewURL}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isSaving ? 'Applying...' : 'Set as Chat Wallpaper'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
