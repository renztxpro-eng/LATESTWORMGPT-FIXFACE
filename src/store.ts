import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  token: string;
  username: string;
  email: string;
  fullname: string;
  avatarUrl: string;
}

export interface Settings {
  apiKey: string;
  apiKeys: { id: number; key: string }[];
  selectedModel: string;
}

interface AppState {
  user: User | null;
  settings: Settings;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setSettings: (updates: Partial<Settings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      settings: {
        apiKey: '',
        apiKeys: [],
        selectedModel: 'deepseek/deepseek-chat',
      },
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      setSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
    }),
    {
      name: 'wormgpt-storage',
    }
  )
);
