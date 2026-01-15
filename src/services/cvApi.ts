/**
 * CV Module API Service
 * Handles all communication with the Python Flask backend
 */

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
    credits_by_person: Record<string, number>;
    credits_by_department: Record<string, number>;
    recent_transactions: CreditTransaction[];
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
    total_credits_distributed: number;
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
}

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
            };
        }

        const data = await response.json();
        return { data, error: null, success: true };
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error',
            success: false,
        };
    }
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

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: errorData.error || 'Upload failed', success: false };
        }

        const data = await response.json();
        return { data, error: null, success: true };
    } catch (error) {
        return { data: null, error: error instanceof Error ? error.message : 'Upload error', success: false };
    }
}

/**
 * Process an uploaded video with AI detection
 */
export async function processVideo(
    filename: string,
    confidence: number = 0.5
): Promise<ApiResponse<ProcessingResult>> {
    const response = await apiRequest<{ message: string; results: any }>('/process', {
        method: 'POST',
        body: JSON.stringify({ filename, confidence }),
    });

    // Backend returns {message, results}, we need to extract results
    if (response.success && response.data) {
        return {
            success: true,
            error: null,
            data: response.data.results as ProcessingResult,
        };
    }

    return {
        success: false,
        error: response.error,
        data: null,
    };
}

/**
 * Get processing results for a video
 */
export async function getResults(filename: string): Promise<ApiResponse<{ events: DetectionEvent[] }>> {
    return apiRequest<{ events: DetectionEvent[] }>(`/results/${filename}`);
}

// ============================================================
// DATABASE API
// ============================================================

/**
 * Get all detection events with optional filtering
 */
export async function getEvents(params?: {
    limit?: number;
    room_id?: string;
    action_type?: string;
    action?: string;
    department?: string;
    status?: string;
    search?: string;
}): Promise<ApiResponse<{ events: DetectionEvent[]; total: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.room_id) searchParams.set('room_id', params.room_id);
    if (params?.action_type) searchParams.set('action_type', params.action_type);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return apiRequest<{ events: DetectionEvent[]; total: number }>(
        `/db/events${query ? `?${query}` : ''}`
    );
}

/**
 * Update event verification status
 */
export async function updateEventStatus(eventId: number, status: string): Promise<ApiResponse<DetectionEvent>> {
    return apiRequest<DetectionEvent>(`/db/events/${eventId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

/**
 * Get all tracked persons
 */
export async function getPersons(): Promise<ApiResponse<{ persons: Person[] }>> {
    return apiRequest<{ persons: Person[] }>('/db/persons');
}

/**
 * Get a specific person by ID
 */
export async function getPerson(personId: string): Promise<ApiResponse<Person>> {
    return apiRequest<Person>(`/db/persons/${personId}`);
}

/**
 * Get the sustainability leaderboard
 */
export async function getLeaderboard(): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[] }>> {
    return apiRequest<{ leaderboard: LeaderboardEntry[] }>('/db/leaderboard');
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<ApiResponse<DatabaseStats>> {
    return apiRequest<DatabaseStats>('/db/stats');
}

/**
 * Get statistics for the Admin dashboard
 */
export async function getAdminStats(): Promise<ApiResponse<{
    pending_count: number;
    hc_count: number;
    avg_accuracy: number;
    total_verified: number;
}>> {
    return apiRequest<{
        pending_count: number;
        hc_count: number;
        avg_accuracy: number;
        total_verified: number;
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
    return apiRequest<EnergyReport>(`/energy/report${query ? `?${query}` : ''}`);
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
    return apiRequest<BlockchainCredits>(`/energy/blockchain-credits${query ? `?${query}` : ''}`);
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
    return apiRequest<{ actions: DetectionEvent[] }>(
        `/energy/sustainable-actions${query ? `?${query}` : ''}`
    );
}

/**
 * Get real-time live metrics
 */
export async function getLiveMetrics(): Promise<ApiResponse<LiveMetrics>> {
    return apiRequest<LiveMetrics>('/energy/live-metrics');
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
    return apiRequest('/');
}

/**
 * List all uploaded videos
 */
export async function listUploads(): Promise<ApiResponse<{ files: string[] }>> {
    return apiRequest<{ files: string[] }>('/list/uploads');
}

/**
 * List all result files
 */
export async function listResults(): Promise<ApiResponse<{ files: string[] }>> {
    return apiRequest<{ files: string[] }>('/list/results');
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

/**
 * Perform identity authentication (actual end-to-end)
 */
export async function authLogin(credentials: any): Promise<ApiResponse<{ success: boolean; user: any; environment: string }>> {
    return apiRequest<{ success: boolean; user: any; environment: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
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
    return apiRequest<{ success: boolean; transaction_hash: string; amount: number; message: string }>('/db/transfer', {
        method: 'POST',
        body: JSON.stringify({ sender_id: senderId, recipient_id: recipientId, amount }),
    });
}

/**
 * Register a new user (student or faculty only)
 */
export async function authRegister(data: {
    email: string;
    password: string;
    name?: string;
    role: 'student' | 'faculty';
    department?: string;
}): Promise<ApiResponse<{ success: boolean; user: any; message: string }>> {
    return apiRequest<{ success: boolean; user: any; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get list of users (admin only)
 */
export async function getUsers(): Promise<ApiResponse<{ users: any[]; total: number }>> {
    return apiRequest<{ users: any[]; total: number }>('/auth/users');
}

// Export the API base URL for debugging
export const getApiBaseUrl = () => API_BASE;
