import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, Flame, Heart, Smile, PartyPopper } from 'lucide-react';
import { searchTenorGifs, TenorGif } from '../services/tenorService';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gif: TenorGif) => void;
  title?: string;
}

const CATEGORIES = [
  { label: '🔥 Trending', query: 'trending' },
  { label: '❤️ Love & Heart', query: 'heart' },
  { label: '😂 Funny & Memes', query: 'funny' },
  { label: '🎉 Cheers & Party', query: 'cheers' },
  { label: '🇨🇳 China & Panda', query: 'china' },
  { label: '🐱 Cats & Pets', query: 'cat' },
  { label: '😱 Shock & Mindblown', query: 'shock' },
  { label: '🍵 Tea & Vibe', query: 'tea' }
];

export const GifPickerModal: React.FC<GifPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectGif,
  title = 'Tenor GIFs'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);

    const term = searchQuery.trim() || activeCategory;
    searchTenorGifs(term).then((results) => {
      if (active) {
        setGifs(results);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, searchQuery, activeCategory]);

  if (!isOpen) return null;

  const isCustomUrl = searchQuery.trim().startsWith('http');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-mono font-black uppercase">
              TENOR
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3 pt-2">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl px-3 py-2 text-zinc-400 focus-within:text-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
            <Search size={16} className="shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tenor GIFs or paste any GIF URL..."
              className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.query}
              type="button"
              onClick={() => {
                setActiveCategory(cat.query);
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-colors ${
                activeCategory === cat.query && !searchQuery
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 min-h-[280px]">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-12 text-zinc-400 text-xs gap-2">
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading Tenor GIFs...</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-zinc-400 text-xs">
              No GIFs found. Try searching for "heart", "dance", or "funny".
            </div>
          ) : (
            gifs.map((gif) => (
              <div
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif);
                  onClose();
                }}
                className="cursor-pointer group relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-video hover:ring-2 hover:ring-emerald-500 transition-all shadow-xs"
              >
                <img
                  src={gif.previewUrl || gif.url}
                  alt={gif.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-[10px] text-white font-medium truncate drop-shadow-md">
                    {gif.title}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
