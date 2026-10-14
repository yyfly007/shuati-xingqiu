import { create } from 'zustand';
import { callFunction } from '../services/cloud';
import { User } from '../types';

interface UserState {
  user: User | null;
  loaded: boolean;
  loading: boolean;
  /** 每次切换页面时重新拉取，保证统计是最新的 */
  refresh: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, getState) => ({
  user: null,
  loaded: false,
  loading: false,
  refresh: async () => {
    if (getState().loading) return;
    set({ loading: true });
    try {
      const user = await callFunction<User>('login', { silent: true });
      set({ user, loaded: true, loading: false });
    } catch (e) {
      console.error('[user] login failed:', e);
      set({ loading: false });
    }
  },
}));
