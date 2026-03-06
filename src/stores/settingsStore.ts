import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'de';
type Theme = 'dark' | 'light';

interface SettingsStore {
  language: Language;
  theme: Theme;
  audioEnabled: boolean;
  audioVolume: number; // 0-1
  hapticEnabled: boolean;

  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setAudioVolume: (volume: number) => void;
  setHapticEnabled: (enabled: boolean) => void;
  toggleAudio: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      theme: 'dark',
      audioEnabled: true,
      audioVolume: 0.8,
      hapticEnabled: true,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setAudioVolume: (audioVolume) => set({ audioVolume: Math.max(0, Math.min(1, audioVolume)) }),
      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),
      toggleAudio: () => set({ audioEnabled: !get().audioEnabled }),
    }),
    {
      name: 'acls-settings',
    }
  )
);
