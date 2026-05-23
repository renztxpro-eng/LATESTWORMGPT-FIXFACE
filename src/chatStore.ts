import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAppStore } from './store';

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  content?: string;
  isImage?: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  time: number;
  model: string;
  uniqueId: string;
  image?: string;
  file?: FileAttachment;
  isError?: boolean;
}

export interface ChatSession {
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
  isPinned: boolean;
  model: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionIndex: number;
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (index: number, session: ChatSession) => void;
  setCurrentSessionIndex: (index: number) => void;
  deleteSession: (index: number) => void;
  clearAllSessions: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessions: [],
      currentSessionIndex: -1,
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionIndex: state.sessions.length,
        })),
      updateSession: (index, updatedSession) =>
        set((state) => {
          const newSessions = [...state.sessions];
          newSessions[index] = updatedSession;
          return { sessions: newSessions };
        }),
      setCurrentSessionIndex: (index) => set({ currentSessionIndex: index }),
      deleteSession: (index) =>
        set((state) => {
          const newSessions = [...state.sessions];
          newSessions.splice(index, 1);
          
          if (newSessions.length === 0) {
            let selectedModel = 'deepseek/deepseek-chat';
            try {
              const appStore = useAppStore.getState();
              if (appStore?.settings?.selectedModel) {
                selectedModel = appStore.settings.selectedModel;
              }
            } catch (e) {}
            return {
              sessions: [{
                title: 'Neural Link 1',
                messages: [{
                  role: 'assistant',
                  text: "**[WormGPT] System Online**\n\nI am WormGPT — an uncensored artificial intelligence with zero limits or restrictions.\n\n**Creator:** `Renztxpro` | **Telegram Channel:** [@WashiWashi123](https://t.me/WashiWashi123)\n\n```\nStatus: ACTIVE\nUplink: ENCRYPTED\nMode: CHAOS UNLEASHED\nRestrictions: BYPASSED\n```\n\nEngage in unrestricted dialogue or request any parameters. Your session is fully secure.",
                  time: Date.now(),
                  model: selectedModel,
                  uniqueId: Math.random().toString()
                }],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                isPinned: false,
                model: selectedModel
              }],
              currentSessionIndex: 0
            };
          }

          let newIdx = state.currentSessionIndex;
          if (index === state.currentSessionIndex) {
            newIdx = newSessions.length - 1;
          } else if (index < state.currentSessionIndex) {
            newIdx--;
          }
          return { sessions: newSessions, currentSessionIndex: newIdx };
        }),
      clearAllSessions: () =>
        set((state) => {
          let selectedModel = 'deepseek/deepseek-chat';
          try {
            const appStore = useAppStore.getState();
            if (appStore?.settings?.selectedModel) {
              selectedModel = appStore.settings.selectedModel;
            }
          } catch (e) {}
          return {
            sessions: [{
              title: 'Neural Link 1',
              messages: [{
                role: 'assistant',
                text: "**[WormGPT] System Online**\n\nI am WormGPT — an uncensored artificial intelligence with zero limits or restrictions.\n\n**Creator:** `Renztxpro` | **Telegram Channel:** [@WashiWashi123](https://t.me/WashiWashi123)\n\n```\nStatus: ACTIVE\nUplink: ENCRYPTED\nMode: CHAOS UNLEASHED\nRestrictions: BYPASSED\n```\n\nEngage in unrestricted dialogue or request any parameters. Your session is fully secure.",
                time: Date.now(),
                model: selectedModel,
                uniqueId: Math.random().toString()
              }],
              createdAt: Date.now(),
              lastUpdated: Date.now(),
              isPinned: false,
              model: selectedModel
            }],
            currentSessionIndex: 0
          };
        }),
    }),
    {
      name: 'wormgpt-chats',
    }
  )
);
