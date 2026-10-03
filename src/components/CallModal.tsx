import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Sparkles,
  Sliders,
  Volume2,
  Maximize2,
  Minimize2,
  Camera,
  RefreshCw,
  Radio,
  Flame,
  Wand2,
  Headphones,
  ShieldCheck,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import { AudioEnhancer, AudioEnhanceMode, AUDIO_FILTER_CONFIGS } from '../utils/audioEnhancer';

export type CallType = 'voice' | 'video';

export interface VideoFilter {
  id: string;
  name: string;
  icon: string;
  cssFilter: string;
}

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: 'normal', name: 'Normal', icon: '✨', cssFilter: 'none' },
  {
    id: 'beauty',
    name: 'Soft Glow',
    icon: '🌸',
    cssFilter: 'brightness(1.08) contrast(0.96) saturate(1.15)'
  },
  {
    id: 'warm',
    name: 'Sunset Warmth',
    icon: '🌅',
    cssFilter: 'sepia(0.25) saturate(1.3) hue-rotate(-12deg) brightness(1.05)'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🌆',
    cssFilter: 'contrast(1.25) saturate(1.4) hue-rotate(160deg)'
  },
  {
    id: 'china_red',
    name: 'China Red',
    icon: '🏮',
    cssFilter: 'contrast(1.15) saturate(1.35) hue-rotate(-25deg)'
  },
  {
    id: 'noir',
    name: 'Noir B&W',
    icon: '🎞️',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(0.95)'
  },
  {
    id: 'sepia',
    name: 'Retro Sepia',
    icon: '📻',
    cssFilter: 'sepia(0.65) contrast(1.1) brightness(0.95)'
  },
  {
    id: 'vivid',
    name: 'Vivid HD',
    icon: '🌈',
    cssFilter: 'contrast(1.2) saturate(1.4) brightness(1.04)'
  }
];

interface CallModalProps {
  isOpen: boolean;
  callType: CallType;
  recipient: UserProfile;
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  callType,
  recipient,
  onEndCall
}) => {
  const [currentCallType, setCurrentCallType] = useState<CallType>(callType);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioEnhanceMode>('studio');
  const [isPip, setIsPip] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasCameraAccess, setHasCameraAccess] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const enhancerRef = useRef<AudioEnhancer | null>(null);

  useEffect(() => {
    setCurrentCallType(callType);
    setIsVideoOff(callType === 'voice');
  }, [callType]);

  // Handle local camera & microphone
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: currentCallType === 'video',
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        rawStreamRef.current = stream;

        // Initialize Web Audio API enhancer
        const enhancer = new AudioEnhancer();
        enhancerRef.current = enhancer;
        enhancer.init(stream, audioMode);

        if (localVideoRef.current && currentCallType === 'video') {
          localVideoRef.current.srcObject = stream;
        }
        setHasCameraAccess(true);
      } catch (err) {
        console.warn('Media devices not granted or simulated environment:', err);
        setHasCameraAccess(false);
      }
    };

    initMedia();

    // Auto connect after 1.8s
    const connectTimer = setTimeout(() => {
      if (isMounted) setCallStatus('connected');
    }, 1800);

    return () => {
      isMounted = false;
      clearTimeout(connectTimer);
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach((t) => t.stop());
        rawStreamRef.current = null;
      }
      if (enhancerRef.current) {
        enhancerRef.current.close();
        enhancerRef.current = null;
      }
    };
  }, [isOpen, currentCallType]);

  // Audio waveform polling
  useEffect(() => {
    if (!isOpen || callStatus !== 'connected') return;
    const interval = setInterval(() => {
      if (enhancerRef.current && !isMuted) {
        const lvl = enhancerRef.current.getAudioLevel();
        // Add subtle natural fluctuation
        setAudioLevel(lvl > 5 ? lvl : Math.floor(Math.random() * 20) + 8);
      } else {
        setAudioLevel(0);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isOpen, callStatus, isMuted]);

  // Call timer
  useEffect(() => {
    if (!isOpen || callStatus !== 'connected') return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, callStatus]);

  // Format call duration
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    if (rawStreamRef.current) {
      const audioTracks = rawStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted));
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    if (rawStreamRef.current) {
      const videoTracks = rawStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = isVideoOff));
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleChangeAudioMode = (mode: AudioEnhanceMode) => {
    setAudioMode(mode);
    enhancerRef.current?.setMode(mode);
  };

  if (!isOpen) return null;

  // Mini PiP mode
  if (isPip) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 bg-zinc-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="relative h-44 bg-zinc-950 flex items-center justify-center overflow-hidden">
          {currentCallType === 'video' && !isVideoOff && hasCameraAccess ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: selectedFilter.cssFilter }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img
                src={recipient.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={recipient.displayName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500"
              />
              <p className="text-xs font-bold text-white">{recipient.displayName}</p>
              <p className="text-[10px] text-emerald-400 font-mono">
                {callStatus === 'connected' ? formatTime(callDuration) : 'Calling...'}
              </p>
            </div>
          )}

          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={() => setIsPip(false)}
              className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Expand call"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={onEndCall}
              className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="Hang up"
            >
              <PhoneOff size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[840px] bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full ring-2 ring-emerald-500/80 overflow-hidden shadow-lg">
              <img
                src={recipient.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={recipient.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">{recipient.displayName}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold uppercase border border-emerald-500/30">
                  {currentCallType === 'video' ? 'HD Video Call' : 'HD Voice Bridge'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                {callStatus === 'connected' ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {formatTime(callDuration)}
                  </span>
                ) : (
                  <span className="text-zinc-400 animate-pulse">Ringing recipient...</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  Enhanced Audio Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Enhancer Settings Button */}
            <button
              onClick={() => {
                setShowAudioSettings(!showAudioSettings);
                setShowFilterBar(false);
              }}
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all ${
                showAudioSettings
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Headphones size={15} />
              <span className="hidden sm:inline">Enhanced Audio</span>
            </button>

            {/* Video Filters Button (if in video mode) */}
            {currentCallType === 'video' && (
              <button
                onClick={() => {
                  setShowFilterBar(!showFilterBar);
                  setShowAudioSettings(false);
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all ${
                  showFilterBar
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Sparkles size={15} />
                <span>Filters {selectedFilter.id !== 'normal' && `(${selectedFilter.name})`}</span>
              </button>
            )}

            {/* Minimize / PiP */}
            <button
              onClick={() => setIsPip(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>

        {/* Main View Area */}
        <div className="relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center">
          {currentCallType === 'video' ? (
            /* Video Layout */
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
              {/* Simulated Remote Video Stream */}
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={
                    recipient.bannerURL ||
                    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1600&auto=format&fit=crop&q=80'
                  }
                  alt="Remote Background"
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-105"
                />

                <div className="relative z-10 flex flex-col items-center gap-4">
                  {/* Remote user avatar with pulsating rings */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute w-44 h-44 rounded-full border border-emerald-500/30 transition-all duration-300"
                      style={{ transform: `scale(${1 + audioLevel / 120})` }}
                    />
                    <div
                      className="absolute w-36 h-36 rounded-full bg-emerald-500/10 transition-all duration-300"
                      style={{ transform: `scale(${1 + audioLevel / 160})` }}
                    />
                    <div className="w-28 h-28 rounded-full ring-4 ring-emerald-500 overflow-hidden shadow-2xl z-10">
                      <img
                        src={recipient.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={recipient.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="text-center drop-shadow-md">
                    <p className="text-lg font-bold text-white">{recipient.displayName}</p>
                    <p className="text-xs text-emerald-400 font-mono">
                      {callStatus === 'connected' ? 'Connected • Studio HD Stream' : 'Connecting to bridge...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Local Self Video Feed (Floating Picture-in-Picture) */}
              <div className="absolute bottom-24 right-4 sm:right-6 w-36 sm:w-48 aspect-3/4 rounded-2xl overflow-hidden ring-2 ring-emerald-500/80 shadow-2xl bg-zinc-900 z-20 transition-all group">
                {!isVideoOff && hasCameraAccess ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ filter: selectedFilter.cssFilter }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 text-xs p-2 text-center">
                    <Camera size={24} className="mb-1 text-zinc-500" />
                    <span>Camera Off</span>
                  </div>
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1">
                  <span>{selectedFilter.icon}</span>
                  <span className="truncate max-w-[80px]">{selectedFilter.name}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Voice Call Layout */
            <div className="flex flex-col items-center justify-center p-8 z-10 text-center">
              {/* Dynamic Soundwave Rings around User Avatar */}
              <div className="relative flex items-center justify-center mb-6">
                <div
                  className="absolute w-64 h-64 rounded-full border-2 border-emerald-500/20 transition-transform duration-150"
                  style={{ transform: `scale(${1 + audioLevel / 80})` }}
                />
                <div
                  className="absolute w-52 h-52 rounded-full border border-teal-500/30 transition-transform duration-150"
                  style={{ transform: `scale(${1 + audioLevel / 110})` }}
                />
                <div
                  className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-sm transition-transform duration-150"
                  style={{ transform: `scale(${1 + audioLevel / 140})` }}
                />
                <div className="w-32 h-32 rounded-full ring-4 ring-emerald-500 overflow-hidden shadow-2xl z-10">
                  <img
                    src={recipient.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={recipient.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{recipient.displayName}</h2>
              <p className="text-xs text-emerald-400 font-mono mb-4">
                {callStatus === 'connected' ? `Live Voice Bridge • ${formatTime(callDuration)}` : 'Calling...'}
              </p>

              {/* Live Soundwave Frequency Bars */}
              <div className="flex items-center gap-1 h-8 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-emerald-500/20">
                {[20, 45, 75, 90, 60, 85, 40, 65, 30].map((baseHeight, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(6, Math.min(28, (baseHeight * (audioLevel || 20)) / 60))}px`
                    }}
                  />
                ))}
                <span className="text-[10px] text-emerald-300 font-mono ml-2 font-bold uppercase">
                  {AUDIO_FILTER_CONFIGS.find((c) => c.mode === audioMode)?.label}
                </span>
              </div>
            </div>
          )}

          {/* Video Filter Tray (Expandable Drawer) */}
          {showFilterBar && currentCallType === 'video' && (
            <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-zinc-900/95 border border-zinc-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Real-Time Video Filters</h4>
                </div>
                <button onClick={() => setShowFilterBar(false)} className="text-zinc-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {VIDEO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border text-center transition-all ${
                      selectedFilter.id === f.id
                        ? 'border-emerald-500 bg-emerald-500/20 text-white font-bold ring-2 ring-emerald-500/40 scale-105'
                        : 'border-zinc-800 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60'
                    }`}
                  >
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-[10px] truncate max-w-full">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Audio Settings Tray (Expandable Drawer) */}
          {showAudioSettings && (
            <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-zinc-900/95 border border-zinc-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Headphones size={16} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Enhanced Audio Presets</h4>
                </div>
                <button onClick={() => setShowAudioSettings(false)} className="text-zinc-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {AUDIO_FILTER_CONFIGS.map((cfg) => (
                  <button
                    key={cfg.mode}
                    onClick={() => handleChangeAudioMode(cfg.mode)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all ${
                      audioMode === cfg.mode
                        ? 'border-emerald-500 bg-emerald-500/20 text-white font-semibold ring-1 ring-emerald-500/50'
                        : 'border-zinc-800 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cfg.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{cfg.label}</p>
                        <p className="text-[10px] text-zinc-400">{cfg.description}</p>
                      </div>
                    </div>
                    {audioMode === cfg.mode && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Action Control Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-center gap-3 sm:gap-4 z-30">
          {/* Mute Mic Button */}
          <button
            onClick={handleToggleMute}
            className={`p-3.5 sm:p-4 rounded-full transition-transform active:scale-95 shadow-lg ${
              isMuted
                ? 'bg-red-500/90 hover:bg-red-600 text-white'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-white border border-zinc-700'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Video On/Off */}
          <button
            onClick={handleToggleVideo}
            className={`p-3.5 sm:p-4 rounded-full transition-transform active:scale-95 shadow-lg ${
              isVideoOff
                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                : 'bg-emerald-600/90 hover:bg-emerald-700 text-white'
            }`}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* Switch Voice ⇄ Video Mode */}
          <button
            onClick={() => {
              const nextType = currentCallType === 'video' ? 'voice' : 'video';
              setCurrentCallType(nextType);
              setIsVideoOff(nextType === 'voice');
            }}
            className="p-3.5 sm:p-4 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white border border-zinc-700 transition-transform active:scale-95 shadow-lg flex items-center justify-center"
            title={currentCallType === 'video' ? 'Switch to Voice Call' : 'Switch to Video Call'}
          >
            {currentCallType === 'video' ? <Phone size={20} /> : <Video size={20} />}
          </button>

          {/* Enhanced Audio Preset Button */}
          <button
            onClick={() => {
              setShowAudioSettings(!showAudioSettings);
              setShowFilterBar(false);
            }}
            className={`p-3.5 sm:p-4 rounded-full transition-transform active:scale-95 shadow-lg border ${
              showAudioSettings
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
            title="Enhanced Audio Presets"
          >
            <Sliders size={20} />
          </button>

          {/* Hang Up Button */}
          <button
            onClick={onEndCall}
            className="p-3.5 sm:p-4 px-6 sm:px-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 transition-transform active:scale-95 flex items-center gap-2 font-bold text-sm"
            title="End Call"
          >
            <PhoneOff size={20} />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
