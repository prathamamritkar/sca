import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'faculty' | 'admin';

interface User {
    email: string;
    role: UserRole;
    name?: string;
    department?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    useMockData: boolean;
    user: User | null;
    // Legacy compatibility
    userEmail: string | null;
    login: (user: User, useMock: boolean) => void;
    logout: () => void;
    toggleMockData: (useMock: boolean) => void;
    // Helper getters
    isAdmin: () => boolean;
    isFaculty: () => boolean;
    isStudent: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            useMockData: true,
            user: null,
            userEmail: null,
            login: (user: User, useMock: boolean) =>
                set({
                    isAuthenticated: true,
                    user,
                    userEmail: user.email,
                    useMockData: useMock
                }),
            logout: () =>
                set({
                    isAuthenticated: false,
                    user: null,
                    userEmail: null,
                    useMockData: true
                }),
            toggleMockData: (useMock: boolean) =>
                set({ useMockData: useMock }),
            isAdmin: () => get().user?.role === 'admin',
            isFaculty: () => get().user?.role === 'faculty',
            isStudent: () => get().user?.role === 'student',
        }),
        {
            name: 'sca-auth-storage',
        }
    )
);
