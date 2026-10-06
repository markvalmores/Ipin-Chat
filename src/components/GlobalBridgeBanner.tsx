import React, { useState } from 'react';
import { ShieldCheck, Globe, Wifi, Info, X, LogIn } from 'lucide-react';

interface GlobalBridgeBannerProps {
  onOpenAuthModal?: () => void;
}

export const GlobalBridgeBanner: React.FC<GlobalBridgeBannerProps> = ({ onOpenAuthModal }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white text-xs px-4 py-1.5 border-b border-emerald-500/20 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        <span className="font-semibold text-emerald-300 flex items-center gap-1">
          <Globe size={13} />
          Cross-Border Bridge:
        </span>
        <span className="text-zinc-200 truncate">
          Active • Unrestricted China ⇄ Worldwide Route • 24ms Real-Time
        </span>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-emerald-400 hover:text-emerald-300 underline text-[11px] ml-1 flex items-center gap-0.5 shrink-0"
        >
          <Info size={11} />
          Details
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
          <Wifi size={12} />
          Encrypted WebSockets
        </span>

        {onOpenAuthModal && (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="px-2 py-0.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/30"
            title="Log in to account / Switch account"
          >
            <LogIn size={11} />
            <span>Log In</span>
          </button>
        )}

        <button
          onClick={() => setIsDismissed(true)}
          className="text-zinc-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {showDetails && (
        <div className="absolute top-9 left-4 z-40 max-w-sm p-4 bg-zinc-900 border border-emerald-500/40 rounded-2xl shadow-2xl text-xs text-zinc-300 space-y-2">
          <div className="flex items-center justify-between text-white font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={16} />
              ipin Cross-Border Architecture
            </span>
            <button onClick={() => setShowDetails(false)}>
              <X size={14} />
            </button>
          </div>
          <p className="leading-relaxed">
            ipin Messenger uses an intelligent global proxy bridge allowing users inside mainland China and international users across North America, Europe, and Asia to exchange text, photos (PNG, GIF, JPG, BMP, APNG), and videos (MP4, AVI, FLV, SWF) seamlessly without restrictions.
          </p>
          <div className="pt-1 text-[11px] text-emerald-400 font-mono">
            Status: Fully Operational • Direct Peer Mesh
          </div>
        </div>
      )}
    </div>
  );
};
