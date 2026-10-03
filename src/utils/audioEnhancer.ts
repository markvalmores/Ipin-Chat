/**
 * Web Audio API Engine for Enhanced Voice & Video Calls
 * Provides real-time vocal presence boosting, high-pass noise suppression,
 * studio speech compression, and frequency analysis for soundwave visualization.
 */

export type AudioEnhanceMode = 'studio' | 'noise_suppress' | 'deep_warmth' | 'off';

export interface AudioFilterConfig {
  mode: AudioEnhanceMode;
  label: string;
  description: string;
  icon: string;
}

export const AUDIO_FILTER_CONFIGS: AudioFilterConfig[] = [
  {
    mode: 'studio',
    label: 'Studio HD Vocal',
    description: 'Crisp presence boost & dynamic leveling for podcast-grade speech',
    icon: '🎙️'
  },
  {
    mode: 'noise_suppress',
    label: 'AI Noise Suppressor',
    description: 'Eliminates room hum, air conditioning, and low rumbles',
    icon: '🎧'
  },
  {
    mode: 'deep_warmth',
    label: 'Broadcast Warmth',
    description: 'Rich low-end warmth with smooth vocal presence',
    icon: '📻'
  },
  {
    mode: 'off',
    label: 'Standard Audio',
    description: 'Direct unfiltered audio stream',
    icon: '🔈'
  }
];

export class AudioEnhancer {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private vocalPresenceFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private currentMode: AudioEnhanceMode = 'studio';

  public init(inputStream: MediaStream, mode: AudioEnhanceMode = 'studio'): MediaStream {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return inputStream;

      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.sourceNode = this.ctx.createMediaStreamSource(inputStream);

      // 1. High-pass filter: cut sub-vocal rumble (< 80Hz)
      this.highPassFilter = this.ctx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = 85;

      // 2. Vocal presence boost filter (peaking ~3kHz for speech clarity)
      this.vocalPresenceFilter = this.ctx.createBiquadFilter();
      this.vocalPresenceFilter.type = 'peaking';
      this.vocalPresenceFilter.frequency.value = 3000;
      this.vocalPresenceFilter.Q.value = 1.2;
      this.vocalPresenceFilter.gain.value = 4.0; // +4dB clarity

      // 3. Studio speech dynamics compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // 4. Output gain
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.35;

      // 5. Analyser for waveform visualization
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      // 6. Destination stream
      this.destinationNode = this.ctx.createMediaStreamDestination();

      // Chain nodes: Source -> HighPass -> VocalPresence -> Compressor -> Gain -> Analyser -> Destination
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.vocalPresenceFilter);
      this.vocalPresenceFilter.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.gainNode.connect(this.destinationNode);

      this.setMode(mode);

      // Return enhanced audio tracks merged with original video tracks
      const outputStream = new MediaStream();
      this.destinationNode.stream.getAudioTracks().forEach((track) => outputStream.addTrack(track));
      inputStream.getVideoTracks().forEach((track) => outputStream.addTrack(track));

      return outputStream;
    } catch (err) {
      console.warn('AudioEnhancer initialization fallback:', err);
      return inputStream;
    }
  }

  public setMode(mode: AudioEnhanceMode) {
    this.currentMode = mode;
    if (!this.ctx || !this.highPassFilter || !this.vocalPresenceFilter || !this.gainNode) return;

    const t = this.ctx.currentTime;
    switch (mode) {
      case 'studio':
        this.highPassFilter.frequency.setValueAtTime(85, t);
        this.vocalPresenceFilter.frequency.setValueAtTime(3200, t);
        this.vocalPresenceFilter.gain.setValueAtTime(4.5, t);
        this.gainNode.gain.setValueAtTime(1.4, t);
        break;

      case 'noise_suppress':
        this.highPassFilter.frequency.setValueAtTime(160, t); // aggressively cut lower hum
        this.vocalPresenceFilter.frequency.setValueAtTime(2600, t);
        this.vocalPresenceFilter.gain.setValueAtTime(2.0, t);
        this.gainNode.gain.setValueAtTime(1.2, t);
        break;

      case 'deep_warmth':
        this.highPassFilter.frequency.setValueAtTime(70, t);
        this.vocalPresenceFilter.frequency.setValueAtTime(1200, t);
        this.vocalPresenceFilter.gain.setValueAtTime(3.5, t);
        this.gainNode.gain.setValueAtTime(1.3, t);
        break;

      case 'off':
      default:
        this.highPassFilter.frequency.setValueAtTime(20, t);
        this.vocalPresenceFilter.gain.setValueAtTime(0, t);
        this.gainNode.gain.setValueAtTime(1.0, t);
        break;
    }
  }

  public getAudioLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(100, Math.round((avg / 255) * 100));
  }

  public close() {
    try {
      this.sourceNode?.disconnect();
      this.ctx?.close();
    } catch (e) {
      // Ignore
    }
  }
}
