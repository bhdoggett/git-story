import { create } from "zustand";

type User = {
  id: string;
  githubId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

type UserState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) =>
    set((state) => {
      // Only update if user is different to prevent unnecessary re-renders
      if (state.user?.id === user.id) return state;
      return {
        user,
        isAuthenticated: true,
        isLoading: false,
      };
    }),

  setLoading: (loading) =>
    set((state) => {
      // Only update if loading state is different
      if (state.isLoading === loading) return state;
      return {
        isLoading: loading,
      };
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: { ...currentUser, ...updates },
      });
    }
  },
}));
