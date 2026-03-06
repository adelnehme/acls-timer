import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useSettingsStore } from '../stores/settingsStore';

type SoundName = 'cycleComplete' | 'countdownTick' | 'epiDue' | 'amioDue' | 'roscChime' | 'alert';

const SOUND_URLS: Record<SoundName, string> = {
  cycleComplete: '/audio/cycle-complete.mp3',
  countdownTick: '/audio/countdown-tick.mp3',
  epiDue: '/audio/epi-due.mp3',
  amioDue: '/audio/amio-due.mp3',
  roscChime: '/audio/rosc-chime.mp3',
  alert: '/audio/alert-critical.mp3',
};

// Generate tones programmatically as fallback if audio files don't exist
function createTone(frequency: number, duration: number, type: OscillatorType = 'sine'): Howl {
  // Create a tiny audio context to generate the tone
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.3;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  // Record it to a buffer
  const offlineCtx = new OfflineAudioContext(1, ctx.sampleRate * (duration / 1000), ctx.sampleRate);
  const osc = offlineCtx.createOscillator();
  const g = offlineCtx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  g.gain.setValueAtTime(0.3, 0);
  g.gain.exponentialRampToValueAtTime(0.01, duration / 1000);

  osc.connect(g);
  g.connect(offlineCtx.destination);
  osc.start();
  osc.stop(duration / 1000);

  // We can't easily create a Howl from generated audio,
  // so we'll use the Web Audio API directly for fallback
  ctx.close();

  // Return a dummy Howl that won't error
  return new Howl({ src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='], volume: 0 });
}

export function useAudio() {
  const audioEnabled = useSettingsStore((s) => s.audioEnabled);
  const volume = useSettingsStore((s) => s.audioVolume);
  const soundsRef = useRef<Map<SoundName, Howl>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      // Try to preload audio files
      Object.entries(SOUND_URLS).forEach(([name, url]) => {
        if (!soundsRef.current.has(name as SoundName)) {
          const howl = new Howl({
            src: [url],
            volume,
            preload: true,
            onloaderror: () => {
              // File doesn't exist, will use generated tones instead
            },
          });
          soundsRef.current.set(name as SoundName, howl);
        }
      });

      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, [volume]);

  // Update volume on all sounds when it changes
  useEffect(() => {
    soundsRef.current.forEach((howl) => {
      howl.volume(volume);
    });
  }, [volume]);

  const playTone = useCallback(
    (frequency: number, durationMs: number, type: OscillatorType = 'sine') => {
      if (!audioEnabled) return;

      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume * 0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    },
    [audioEnabled, volume]
  );

  const play = useCallback(
    (name: SoundName) => {
      if (!audioEnabled) return;

      const howl = soundsRef.current.get(name);
      if (howl && howl.state() === 'loaded') {
        howl.play();
        return;
      }

      // Fallback: generate tones programmatically
      switch (name) {
        case 'cycleComplete':
          playTone(880, 200);
          setTimeout(() => playTone(1100, 200), 250);
          setTimeout(() => playTone(1320, 300), 500);
          break;
        case 'countdownTick':
          playTone(660, 80, 'square');
          break;
        case 'epiDue':
          // Urgent siren: loud alternating high-frequency alarm
          playTone(880, 200, 'square');
          setTimeout(() => playTone(660, 200, 'square'), 250);
          setTimeout(() => playTone(880, 200, 'square'), 500);
          setTimeout(() => playTone(660, 200, 'square'), 750);
          setTimeout(() => playTone(880, 300, 'square'), 1000);
          break;
        case 'amioDue':
          // Less urgent: two gentle triangle wave tones
          playTone(523, 250, 'triangle');
          setTimeout(() => playTone(659, 250, 'triangle'), 300);
          setTimeout(() => playTone(523, 250, 'triangle'), 600);
          break;
        case 'roscChime':
          playTone(523, 200);
          setTimeout(() => playTone(659, 200), 200);
          setTimeout(() => playTone(784, 300), 400);
          break;
        case 'alert':
          playTone(880, 100, 'square');
          setTimeout(() => playTone(880, 100, 'square'), 150);
          setTimeout(() => playTone(880, 100, 'square'), 300);
          break;
      }
    },
    [audioEnabled, playTone]
  );

  return { play, playTone };
}
