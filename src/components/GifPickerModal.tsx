import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
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
  title = 'Send Tenor GIF to Chat'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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

  const handleImageError = (id: string, fallbackUrl?: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-2.5 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-400 text-xs font-mono font-black uppercase tracking-wider border border-teal-500/30">
              TENOR
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white">{title}</h3>
              <p className="text-[10px] text-zinc-400">Tap any GIF to send or react instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3.5 pb-2">
          <div className="flex items-center bg-zinc-800/90 rounded-2xl px-3.5 py-2.5 text-zinc-400 focus-within:text-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/40 border border-zinc-700/60 transition-all">
            <Search size={16} className="shrink-0 mr-2.5 text-emerald-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tenor GIFs (love, funny, cat, panda, cheers)..."
              className="w-full bg-transparent text-xs text-white placeholder-zinc-400 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3.5 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.query && !searchQuery;
            return (
              <button
                key={cat.query}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.query);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750 border border-zinc-700/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 gap-2.5 min-h-[300px] bg-zinc-950/60">
          {loading ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-16 text-zinc-400 text-xs gap-3">
              <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Fetching Tenor GIFs...</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-zinc-400 text-xs space-y-2">
              <p>No GIFs found for this query.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('trending');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Show Trending
              </button>
            </div>
          ) : (
            gifs.map((gif) => {
              const hasError = imageErrors[gif.id];

              return (
                <div
                  key={gif.id}
                  onClick={() => {
                    onSelectGif(gif);
                    onClose();
                  }}
                  className="cursor-pointer group relative rounded-2xl overflow-hidden bg-zinc-850 aspect-video border border-zinc-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center"
                >
                  {/* Background placeholder card with emoji */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400">
                    <span className="text-3xl filter drop-shadow-md select-none">
                      {gif.emoji || '✨'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mt-1">
                      {hasError ? 'Tap to Send' : 'Tenor GIF'}
                    </span>
                  </div>

                  {/* Main animated GIF image */}
                  {!hasError && (
                    <img
                      src={gif.previewUrl || gif.url}
                      alt={gif.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => handleImageError(gif.id)}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}

                  {/* Top-left emoji badge */}
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs border border-white/10">
                    {gif.emoji || '✨'}
                  </div>

                  {/* Bottom title banner with gradient shadow */}
                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-4 flex items-end justify-between">
                    <p className="text-[10px] text-white font-bold truncate drop-shadow-md pr-1">
                      {gif.title}
                    </p>
                    <span className="text-[9px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0">
                      SEND ↵
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
