import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'faculty' | 'admin';

interface User {
    user_id?: number;
    email: string;
    role: UserRole;
    name?: string;
    department?: string;
    node_id?: string;
}

interface AuthTokens {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
}

interface AuthState {
    isAuthenticated: boolean;
    useMockData: boolean;
    user: User | null;
    tokens: AuthTokens;
    // Legacy compatibility
    userEmail: string | null;
    // Actions
    loginWithTokens: (user: User, tokens: { access_token: string; refresh_token: string; expires_in: number }, useMock: boolean) => void;
    logout: () => void;
    setUseMockData: (useMock: boolean) => void;
    updateAccessToken: (accessToken: string) => void;
    // Helper getters
    isAdmin: () => boolean;
    isFaculty: () => boolean;
    isStudent: () => boolean;
    getAccessToken: () => string | null;
    getAuthHeader: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            useMockData: true,
            user: null,
            tokens: {
                accessToken: null,
                refreshToken: null,
                expiresIn: null
            },
            userEmail: null,

            loginWithTokens: (user: User, tokens: { access_token: string; refresh_token: string; expires_in: number }, useMock: boolean) =>
                set({
                    isAuthenticated: true,
                    user,
                    userEmail: user.email,
                    useMockData: useMock,
                    tokens: {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        expiresIn: tokens.expires_in
                    }
                }),

            logout: () =>
                set({
                    isAuthenticated: false,
                    user: null,
                    userEmail: null,
                    useMockData: true,
                    tokens: {
                        accessToken: null,
                        refreshToken: null,
                        expiresIn: null
                    }
                }),

            setUseMockData: (useMock: boolean) =>
                set({ useMockData: useMock }),

            updateAccessToken: (accessToken: string) =>
                set(state => ({
                    tokens: {
                        ...state.tokens,
                        accessToken
                    }
                })),

            isAdmin: () => get().user?.role === 'admin',
            isFaculty: () => get().user?.role === 'faculty',
            isStudent: () => get().user?.role === 'student',

            getAccessToken: () => get().tokens.accessToken,

            getAuthHeader: () => {
                const token = get().tokens.accessToken;
                if (token) {
                    return { 'Authorization': `Bearer ${token}` };
                }
                return {};
            }
        }),
        {
            name: 'sca-auth-storage',
        }
    )
);

// Utility function to get the token outside of React components
export const getAccessToken = () => useAuthStore.getState().tokens.accessToken;
export const getAuthHeader = () => useAuthStore.getState().getAuthHeader();
