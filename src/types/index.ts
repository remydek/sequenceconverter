/**
 * Type definitions for Transparent Video Creator
 */

// FFmpeg types
export interface FFmpegProgress {
    ratio: number;
    time: number;
    duration?: number;
}

export interface FFmpegInstance {
    load(): Promise<void>;
    isLoaded(): boolean;
    run(...args: string[]): Promise<void>;
    FS(method: string, ...args: any[]): any;
    exit(): void;
    setProgress(callback: (progress: FFmpegProgress) => void): void;
    setLogger(callback: (log: { type: string; message: string }) => void): void;
}

// Application Configuration
export interface AppConfig {
    environment: string;
    supabase?: {
        url: string;
        anonKey: string;
    };
    features: {
        clientSideProcessing: boolean;
        premiumFeatures: boolean;
        usageTracking: boolean;
        fileUploads: boolean;
        authRequiredForDownload: boolean;
    };
    limits: {
        maxFileSizeMB: number;
        maxProcessingTimeSeconds: number;
        maxFrameCount: number;
        supportedFormats: string[];
    };
    oauth?: {
        google?: {
            clientId: string;
        };
    };
}

// Processing Options
export interface ProcessingOptions {
    fps: number;
    codec: 'vp9' | 'vp8' | 'gif' | 'prores' | 'qtrle' | 'h264';
    quality: 'best' | 'good' | 'realtime';
    outputFormat: 'webm' | 'mp4' | 'gif' | 'mov';
    scale?: {
        width?: number;
        height?: number;
        maintain_aspect_ratio: boolean;
    };
}

// Job Status
export interface ProcessingJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    files: File[];
    options: ProcessingOptions;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    error?: string;
    outputBlob?: Blob;
    outputSize?: number;
    processingTime?: number;
}

// User Authentication
export interface User {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    subscription_tier?: 'free' | 'premium';
    usage_count?: number;
    usage_limit?: number;
    created_at: string;
}

// Supabase Auth
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

// Error Types (now using class from utils/errors.ts)
export interface AppErrorData {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
}

// Event Logging
export interface AnalyticsEvent {
    event: string;
    properties?: Record<string, any>;
    timestamp?: Date;
    user_id?: string;
    session_id?: string;
}

// UI State
export interface UIState {
    isProcessing: boolean;
    currentStep: 'upload' | 'configure' | 'processing' | 'complete' | 'error';
    selectedFiles: File[];
    processingOptions: ProcessingOptions;
    currentJob?: ProcessingJob;
    errors: AppErrorData[];
    toast: {
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        visible: boolean;
    } | null;
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface JobStatusResponse {
    status: ProcessingJob['status'];
    progress: number;
    created_at: string;
    updated_at: string;
    output_size?: number;
    processing_time?: number;
    error?: string;
}

// Component Props
export interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles: number;
    maxSizeMB: number;
    acceptedFileTypes: string[];
    disabled?: boolean;
    className?: string;
}

export interface ProcessingConfigProps {
    options: ProcessingOptions;
    onChange: (options: ProcessingOptions) => void;
    disabled?: boolean;
}

export interface ProgressBarProps {
    progress: number;
    status: ProcessingJob['status'];
    className?: string;
    showPercentage?: boolean;
}

export interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

// Mobile Detection
export interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
}

// Performance Monitoring
export interface PerformanceMetrics {
    loadTime: number;
    processingTime: number;
    fileSize: number;
    frameCount: number;
    outputSize: number;
    memoryUsage?: number;
}

// Feature Flags
export type FeatureFlag =
    | 'premium_features'
    | 'usage_tracking'
    | 'file_uploads'
    | 'auth_required'
    | 'advanced_codecs'
    | 'batch_processing'
    | 'cloud_storage';

export interface FeatureFlags {
    [key: string]: boolean;
}

// Storage
export interface StorageManager {
    set(key: string, value: any): Promise<void>;
    get(key: string): Promise<any>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}

// Hooks
export interface UseProcessingResult {
    processFiles: (files: File[], options: ProcessingOptions) => Promise<Blob>;
    currentJob: ProcessingJob | null;
    isProcessing: boolean;
    progress: number;
    error: AppErrorData | null;
    cancel: () => void;
}

export interface UseAuthResult {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (provider?: 'google' | 'github' | 'email') => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Constants
export const SUPPORTED_FILE_TYPES = ['image/png'] as const;
export const SUPPORTED_CODECS = ['vp9', 'vp8', 'gif', 'h264', 'prores'] as const;
export const QUALITY_LEVELS = ['best', 'good', 'realtime'] as const;

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[number];
export type SupportedCodec = typeof SUPPORTED_CODECS[number];
export type QualityLevel = typeof QUALITY_LEVELS[number];