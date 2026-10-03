import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Type, Upload, Sparkles, Clock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createStory } from '../services/chatService';
import { compressImageForUpload, storeMediaBlob } from '../utils/mediaStore';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

const BG_GRADIENTS = [
  'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
  'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
  'linear-gradient(135deg, #166534 0%, #84cc16 100%)',
  'linear-gradient(135deg, #18181b 0%, #064e3b 100%)'
];

const PRESET_STORY_IMAGES = [
  { label: '🏮 Lanterns', url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80' },
  { label: '🏙️ Shanghai', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80' },
  { label: '🍵 West Lake Tea', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80' },
  { label: '🐼 Giant Panda', url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&auto=format&fit=crop&q=80' }
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'text'>('image');
  const [mediaUrl, setMediaUrl] = useState(PRESET_STORY_IMAGES[0].url);
  const [text, setText] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !profile) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === 'image' || file.type.startsWith('image/')) {
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImageForUpload(file);
        setMediaUrl(compressedBase64);
        setActiveTab('image');
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (event) => setMediaUrl(event.target?.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      const objUrl = URL.createObjectURL(file);
      setMediaUrl(objUrl);
      setActiveTab('video');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'text' && !mediaUrl) return;
    if (activeTab === 'text' && !text.trim()) return;

    setIsSubmitting(true);
    try {
      await createStory(profile, {
        mediaUrl: activeTab === 'text' ? '' : mediaUrl,
        mediaType: activeTab,
        text: text.trim(),
        bgColor: selectedBg
      });
      onStoryCreated?.();
      onClose();
      // Reset
      setMediaUrl('');
      setText('');
    } catch (err) {
      console.error("Story creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-950/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Create a Story</h3>
              <p className="text-xs text-zinc-500">24-hour visual update on ipin Messenger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'image'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <ImageIcon size={16} />
            Photo Story
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'video'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Video size={16} />
            Video Story
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Type size={16} />
            Text / Mood
          </button>
        </div>

        {/* Story Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Preview Box */}
          <div
            className="w-full h-64 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner border border-zinc-200 dark:border-zinc-800"
            style={{
              background: activeTab === 'text' ? selectedBg : '#18181b'
            }}
          >
            {activeTab === 'image' && mediaUrl && (
              <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
            )}
            {activeTab === 'video' && mediaUrl && (
              <video src={mediaUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
            )}
            {activeTab === 'text' && (
              <div className="p-6 text-center text-white max-w-sm">
                <p className="text-xl font-bold break-words drop-shadow-md">
                  {text || 'Type your message below...'}
                </p>
              </div>
            )}

            {/* Empty state prompt */}
            {activeTab !== 'text' && !mediaUrl && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="text-center text-zinc-400 p-6 cursor-pointer hover:text-zinc-200 transition-colors flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <Upload size={20} />
                </div>
                <p className="text-sm font-medium">Click to upload {activeTab}</p>
                <p className="text-xs text-zinc-500">Supports PNG, GIF, JPG, BMP, APNG & MP4/WebM</p>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept={activeTab === 'image' ? 'image/png,image/gif,image/jpeg,image/bmp,image/apng,image/*' : 'video/mp4,video/webm,video/*'}
            className="hidden"
          />

          {/* Media URL / Upload Options */}
          {activeTab !== 'text' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-dashed border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100/50 transition-colors"
                >
                  <Upload size={14} />
                  <span>{isCompressing ? 'Compressing for 24h story...' : 'Upload from Device (Image / Video)'}</span>
                </button>
              </div>

              {activeTab === 'image' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                    Or pick a China landmark / culture preset:
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {PRESET_STORY_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setMediaUrl(preset.url)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all shrink-0 ${
                          mediaUrl === preset.url
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <input
                  type="url"
                  value={mediaUrl.startsWith('data:') ? '' : mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Or paste an image/video URL directly..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Background selector for Text stories */}
          {activeTab === 'text' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Emerald Theme Gradients
              </label>
              <div className="flex gap-2">
                {BG_GRADIENTS.map((bg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedBg(bg)}
                    className={`w-9 h-9 rounded-xl transition-all ${
                      selectedBg === bg ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110' : 'opacity-80'
                    }`}
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Caption / Text */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              {activeTab === 'text' ? 'Story Text' : 'Add a caption (optional)'}
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeTab === 'text' ? 'Share your news, travel note, or feeling...' : 'Add a description...'}
              className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* 24-Hour Lifespan Guarantee Note */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <Clock size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              This story will stay active and visible for exactly <strong>24 hours</strong> before safely expiring.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (activeTab !== 'text' && !mediaUrl) || (activeTab === 'text' && !text.trim())}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Posting...' : 'Share to Story (24h Active)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
