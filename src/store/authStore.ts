import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    useMockData: boolean;
    userEmail: string | null;
    login: (email: string, useMock: boolean) => void;
    logout: () => void;
    toggleMockData: (useMock: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            useMockData: true,
            userEmail: null,
            login: (email: string, useMock: boolean) =>
                set({ isAuthenticated: true, userEmail: email, useMockData: useMock }),
            logout: () =>
                set({ isAuthenticated: false, userEmail: null, useMockData: true }),
            toggleMockData: (useMock: boolean) =>
                set({ useMockData: useMock }),
        }),
        {
            name: 'sca-auth-storage',
        }
    )
);
