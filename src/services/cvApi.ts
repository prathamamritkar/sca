/**
 * CV Module API Service
 * Handles all communication with the Python Flask backend
 */

import { getAuthHeader, useAuthStore } from '@/store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types matching the backend response structure
export interface DetectionEvent {
    event_id: number;
    timestamp: string;
    room_id: string;
    department: string;
    occupancy: boolean;
    person_count: number;
    action_type: 'sustainable' | 'unsustainable' | 'neutral';
    action_detected: string;
    energy_saved_estimate: number;
    blockchain_credits: number;
    devices_on: DeviceInfo[];
    devices_off: DeviceInfo[];
    lights_on: boolean;
    overall_confidence: number;
    action_confidence: number;
    recognized_persons?: RecognizedPerson[];
    video_file?: string | null;
    person_id?: string | null;
    status?: string;
}

export interface DeviceInfo {
    type: string;
    state: 'ON' | 'OFF';
    confidence?: number;
    device_id?: string;
}

export interface RecognizedPerson {
    person_id: string;
    confidence: number;
    detection_method: string;
}

export interface Person {
    person_id: string;
    student_id: string | null;
    department: string;
    user_type: string;
    total_credits_earned: number;
    first_seen: string;
    last_seen: string;
    total_detections: number;
    face_image_path: string | null;
    wallet_address?: string | null;
}

export interface LeaderboardEntry {
    person_id: string;
    student_id: string | null;
    department: string;
    total_credits: number;
    total_activities: number;
    rank: number;
}

export interface EnergyReport {
    time_period_hours: number;
    total_events: number;
    sustainable_actions: number;
    unsustainable_actions: number;
    total_energy_saved_kwh: number;
    total_blockchain_credits: number;
    sustainability_score: number;
    department_breakdown: Record<string, DepartmentStats>;
}

export interface DepartmentStats {
    events: number;
    sustainable: number;
    unsustainable: number;
    credits: number;
}

export interface LiveMetrics {
    current_occupancy: number;
    active_rooms: number;
    devices_on: number;
    devices_off: number;
    recent_sustainable_actions: number;
    recent_unsustainable_actions: number;
    hourly_energy_trend: number[];
}

export interface BlockchainCredits {
    total_credits: number;
    total_blockchain_credits?: number;
    credits_per_kwh?: number;
    credits_by_person: Record<string, number>;
    credits_by_department: Record<string, number>;
    recent_transactions: CreditTransaction[];
    recent_history?: any[];
    blockchain_status?: boolean;
    wallet_address?: string;
}

export interface CreditTransaction {
    timestamp: string;
    person_id: string;
    amount: number;
    reason: string;
    room_id: string;
}

export interface DatabaseStats {
    total_events: number;
    total_persons: number;
    total_activities: number;
    sustainable_events: number;
    unsustainable_events: number;
    total_credits: number;
    total_energy_saved: number;
}

export interface ProcessingResult {
    success: boolean;
    filename: string;
    events_detected: number;
    processing_time_ms: number;
    events: DetectionEvent[];
}

export interface ApiError {
    error: string;
    message: string;
}

// API Response wrapper
interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    success: boolean;
    status: number;
}

/**
 * Base API request function (no authentication)
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                data: null,
                error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
                success: false,
                status: response.status,
            };
        }

        const data = await response.json();
        return { data, error: null, success: true, status: response.status };
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error',
            success: false,
            status: 0,
        };
    }
}

/**
 * Authenticated API request function (includes JWT in headers)
 * Handles automatic token refresh if access token is expired
 */
async function authenticatedApiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const authStore = useAuthStore.getState();
    const authHeader = authStore.getAuthHeader();

    const response = await apiRequest<T>(endpoint, {
        ...options,
        headers: {
            ...authHeader,
            ...options.headers,
        },
    });

    // If 401 Unauthorized, try to refresh token
    if (!response.success && response.status === 401) {
        const refreshToken = authStore.tokens.refreshToken;

        if (refreshToken) {
            console.log('Access token expired, attempting refresh...');
            const refreshResult = await authRefreshToken(refreshToken);

            if (refreshResult.success && refreshResult.data?.access_token) {
                console.log('Token refreshed successfully, retrying request.');
                const newAccessToken = refreshResult.data.access_token;

                // Update store with new token
                authStore.updateAccessToken(newAccessToken);

                // Retry the original request with new token
                return apiRequest<T>(endpoint, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${newAccessToken}`,
                    },
                });
            } else {
                console.error('Token refresh failed.');
                // Handle refresh failure (potentially logout)
                if (!refreshResult.success) {
                    console.log('Force logout due to refresh failure');
                    authStore.logout();
                }
            }
        }
    }

    return response;
}

// ============================================================
// VIDEO PROCESSING API
// ============================================================

/**
 * Upload a video file to the backend
 */
export async function uploadVideo(file: File): Promise<ApiResponse<{ filename: string; message: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const authHeader = getAuthHeader();
    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                ...authHeader,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: errorData.error || 'Upload failed', success: false, status: response.status };
        }

        const data = await response.json();
        return { data, error: null, success: true, status: response.status };
    } catch (error) {
        return { data: null, error: error instanceof Error ? error.message : 'Upload error', success: false, status: 0 };
    }
}

/**
 * Process an uploaded video with AI detection
 */
export async function processVideo(
    filename: string,
    confidence: number = 0.5
): Promise<ApiResponse<ProcessingResult>> {
    const response = await authenticatedApiRequest<{ message: string; results: any }>('/process', {
        method: 'POST',
        body: JSON.stringify({ filename, confidence }),
    });

    // Backend returns {message, results}, we need to extract results
    if (response.success && response.data) {
        return {
            success: true,
            error: null,
            data: response.data.results as ProcessingResult,
            status: response.status
        };
    }

    return {
        success: false,
        error: response.error,
        data: null,
        status: response.status
    };
}

/**
 * Get processing results for a video
 */
export async function getResults(filename: string): Promise<ApiResponse<{ events: DetectionEvent[] }>> {
    return authenticatedApiRequest<{ events: DetectionEvent[] }>(`/results/${filename}`);
}

// ============================================================
// DATABASE API
// ============================================================

/**
 * Get all detection events with optional filtering
 */
export async function getEvents(params?: {
    limit?: number;
    offset?: number;
    room_id?: string;
    action_type?: string;
    action?: string;
    department?: string;
    status?: string;
    search?: string;
    person_id?: string;
}): Promise<ApiResponse<{ events: DetectionEvent[]; total: number; total_credits?: number; total_impact?: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.room_id) searchParams.set('room_id', params.room_id);
    if (params?.action_type) searchParams.set('action_type', params.action_type);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.person_id) searchParams.set('person_id', params.person_id);

    const query = searchParams.toString();
    return authenticatedApiRequest<{ events: DetectionEvent[]; total: number }>(
        `/db/events${query ? `?${query}` : ''}`
    );
}

/**
 * Update event verification status
 */
export async function updateEventStatus(eventId: number, status: string): Promise<ApiResponse<DetectionEvent>> {
    return authenticatedApiRequest<DetectionEvent>(`/db/events/${eventId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

/**
 * Bulk verify high confidence events
 */
export async function bulkVerifyEvents(threshold: number = 0.8): Promise<ApiResponse<{ message: string; updated_count: number }>> {
    return authenticatedApiRequest<{ message: string; updated_count: number }>('/db/events/bulk-verify', {
        method: 'POST',
        body: JSON.stringify({ confidence_threshold: threshold }),
    });
}

/**
 * Export verified events as CSV
 */
export async function exportEvents(): Promise<void> {
    const authHeader = useAuthStore.getState().getAuthHeader();
    const response = await fetch(`${API_BASE}/db/events/export`, {
        headers: {
            ...authHeader
        }
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sca_audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } else {
        throw new Error('Failed to export events');
    }
}

/**
 * Export users as CSV
 */
export async function exportUsers(): Promise<void> {
    const authHeader = useAuthStore.getState().getAuthHeader();
    const response = await fetch(`${API_BASE}/db/users/export`, {
        headers: {
            ...authHeader
        }
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sca_users_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } else {
        throw new Error('Failed to export users');
    }
}

/**
 * Get all tracked persons
 */
export async function getPersons(): Promise<ApiResponse<{ persons: Person[] }>> {
    return authenticatedApiRequest<{ persons: Person[] }>('/db/persons');
}

/**
 * Get a specific person by ID
 */
export async function getPerson(personId: string): Promise<ApiResponse<Person>> {
    return authenticatedApiRequest<Person>(`/db/persons/${personId}`);
}

/**
 * Get the sustainability leaderboard
 */
export async function getLeaderboard(): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[] }>> {
    return authenticatedApiRequest<{ leaderboard: LeaderboardEntry[] }>('/db/leaderboard');
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<ApiResponse<DatabaseStats>> {
    return authenticatedApiRequest<DatabaseStats>('/db/stats');
}

/**
 * Get statistics for the Admin dashboard
 */
export async function getAdminStats(): Promise<ApiResponse<{
    pending_count: number;
    hc_count: number;
    avg_accuracy: number;
    total_verified: number;
    db_size_kb: number;
}>> {
    return authenticatedApiRequest<{
        pending_count: number;
        hc_count: number;
        avg_accuracy: number;
        total_verified: number;
        db_size_kb: number;
    }>('/db/admin-stats');
}

// ============================================================
// ENERGY ANALYTICS API
// ============================================================

/**
 * Get comprehensive energy report
 */
export async function getEnergyReport(params?: {
    hours?: number;
    room_id?: string;
    department?: string;
}): Promise<ApiResponse<EnergyReport>> {
    const searchParams = new URLSearchParams();
    if (params?.hours) searchParams.set('hours', String(params.hours));
    if (params?.room_id) searchParams.set('room_id', params.room_id);
    if (params?.department) searchParams.set('department', params.department);

    const query = searchParams.toString();
    return authenticatedApiRequest<EnergyReport>(`/energy/report${query ? `?${query}` : ''}`);
}

/**
 * Get blockchain credits summary
 */
export async function getBlockchainCredits(params?: {
    person_id?: string;
    hours?: number;
}): Promise<ApiResponse<BlockchainCredits>> {
    const searchParams = new URLSearchParams();
    if (params?.person_id) searchParams.set('person_id', params.person_id);
    if (params?.hours) searchParams.set('hours', String(params.hours));

    const query = searchParams.toString();
    return authenticatedApiRequest<BlockchainCredits>(`/energy/blockchain-credits${query ? `?${query}` : ''}`);
}

/**
 * Get sustainable/unsustainable actions log
 */
export async function getSustainableActions(params?: {
    action_type?: 'sustainable' | 'unsustainable';
    limit?: number;
}): Promise<ApiResponse<{ actions: DetectionEvent[] }>> {
    const searchParams = new URLSearchParams();
    if (params?.action_type) searchParams.set('action_type', params.action_type);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return authenticatedApiRequest<{ actions: DetectionEvent[] }>(
        `/energy/sustainable-actions${query ? `?${query}` : ''}`
    );
}

/**
 * Get real-time live metrics
 */
export async function getLiveMetrics(): Promise<ApiResponse<LiveMetrics>> {
    return authenticatedApiRequest<LiveMetrics>('/energy/live-metrics');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if the backend API is available
 */
export async function checkApiStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/status`, { method: 'GET' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get API info
 */
export async function getApiInfo(): Promise<ApiResponse<{
    name: string;
    version: string;
    endpoints: string[];
}>> {
    return authenticatedApiRequest('/');
}

/**
 * List all uploaded videos
 */
export async function listUploads(): Promise<ApiResponse<{ files: string[] }>> {
    return authenticatedApiRequest<{ files: string[] }>('/list/uploads');
}

/**
 * List all result files
 */
export async function listResults(): Promise<ApiResponse<{ files: string[] }>> {
    return authenticatedApiRequest<{ files: string[] }>('/list/results');
}

/**
 * Submit a contact form inquiry
 */
export async function submitContact(data: { name: string; email: string; message: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiRequest<{ success: boolean; message: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ============================================================
// AUTHENTICATION API (JWT)
// ============================================================

export interface AuthTokenResponse {
    success: boolean;
    message: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: {
        user_id: number;
        email: string;
        role: 'student' | 'faculty' | 'admin';
        name: string;
        department: string;
        node_id?: string;
        last_login?: string;
    };
    environment?: string;
}

/**
 * Authenticate user and get JWT tokens
 */
export async function authLogin(credentials: {
    email: string;
    password: string;
    use_mock?: boolean;
}): Promise<ApiResponse<AuthTokenResponse>> {
    return apiRequest<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

/**
 * Register a new user and get JWT tokens
 */
export async function authRegister(data: {
    email: string;
    password: string;
    name?: string;
    role: 'student' | 'faculty';
    department?: string;
}): Promise<ApiResponse<AuthTokenResponse>> {
    return apiRequest<AuthTokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Refresh access token using refresh token
 */
export async function authRefreshToken(refreshToken: string): Promise<ApiResponse<{
    success: boolean;
    access_token: string;
    token_type: string;
    expires_in: number;
}>> {
    return apiRequest<{ success: boolean; access_token: string; token_type: string; expires_in: number }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<ApiResponse<{
    success: boolean;
    user: {
        user_id: number;
        email: string;
        role: string;
        name: string;
        department: string;
    };
}>> {
    return authenticatedApiRequest<{ success: boolean; user: any }>('/auth/me');
}

/**
 * Get list of users (admin only - requires JWT)
 */
export async function getUsers(): Promise<ApiResponse<{ users: any[]; total: number }>> {
    return authenticatedApiRequest<{ users: any[]; total: number }>('/auth/users');
}

/**
 * Update user role or status (admin only)
 */
export async function updateUser(userId: number, data: { role?: string; is_active?: boolean }): Promise<ApiResponse<{ message: string; user: any }>> {
    return authenticatedApiRequest<{ message: string; user: any }>(`/auth/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * Update wallet address for the current authenticated user
 */
export async function updateWalletAddress(walletAddress: string): Promise<ApiResponse<{ message: string; wallet_address: string }>> {
    return authenticatedApiRequest<{ message: string; wallet_address: string }>('/auth/wallet', {
        method: 'POST',
        body: JSON.stringify({ wallet_address: walletAddress }),
    });
}

/**
 * Bridge internal credits to blockchain tokens (SCC)
 */
export async function bridgeCredits(amount: number): Promise<ApiResponse<{
    success: boolean;
    transaction_hash: string;
    amount_bridged: number;
    message: string;
}>> {
    return authenticatedApiRequest<{ success: boolean; transaction_hash: string; amount_bridged: number; message: string }>('/energy/bridge', {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
}

/**
 * Transfer credits between persons or withdraw to external node
 */
export async function transferCredits(senderId: string, recipientId: string, amount: number): Promise<ApiResponse<{
    success: boolean;
    transaction_hash: string;
    amount: number;
    message: string;
}>> {
    return authenticatedApiRequest<{ success: boolean; transaction_hash: string; amount: number; message: string }>('/energy/transfer', {
        method: 'POST',
        body: JSON.stringify({ sender_id: senderId, recipient_id: recipientId, amount }),
    });
}

// Export the API base URL for debugging
export const getApiBaseUrl = () => API_BASE;
