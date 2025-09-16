/**
 * FFmpeg.wasm service for client-side video processing
 * Handles loading, configuration, and processing operations
 */

import { FFmpegInstance, FFmpegProgress, ProcessingOptions, ProcessingJob } from '../types';
import { AppError } from '../utils/errors';
import { deviceDetector } from '../utils/device';

declare global {
    interface Window {
        FFmpeg: {
            createFFmpeg: (options: any) => FFmpegInstance;
            fetchFile: (input: File | string) => Promise<Uint8Array>;
        };
    }
}

export class FFmpegService {
    private static instance: FFmpegService;
    private ffmpeg: FFmpegInstance | null = null;
    private isLoading = false;
    private progressCallback: ((progress: number) => void) | null = null;
    private logCallback: ((message: string) => void) | null = null;

    private constructor() {}

    public static getInstance(): FFmpegService {
        if (!FFmpegService.instance) {
            FFmpegService.instance = new FFmpegService();
        }
        return FFmpegService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.ffmpeg?.isLoaded()) {
            return;
        }

        if (this.isLoading) {
            // Wait for current loading to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isLoading = true;

        try {
            if (!window.FFmpeg) {
                throw new AppError({
                    code: 'FFMPEG_NOT_LOADED',
                    message: 'FFmpeg.wasm library not found. Please reload the page.',
                    timestamp: new Date()
                });
            }

            const { createFFmpeg } = window.FFmpeg;

            // Configure FFmpeg based on device capabilities
            const config = this.getFFmpegConfig();
            this.ffmpeg = createFFmpeg(config);

            // Set up progress callback
            this.ffmpeg.setProgress((progress: FFmpegProgress) => {
                const percent = Math.round(progress.ratio * 100);
                this.progressCallback?.(percent);
            });

            // Set up logging
            this.ffmpeg.setLogger(({ message }: { message: string }) => {
                if (this.logCallback) {
                    this.logCallback(message);
                } else if (config.log) {
                    console.log('[FFmpeg]', message);
                }
            });

            await this.ffmpeg.load();
            console.log('✅ FFmpeg.wasm initialized successfully');

        } catch (error) {
            console.error('❌ FFmpeg initialization failed:', error);
            throw new AppError({
                code: 'FFMPEG_INIT_FAILED',
                message: 'Failed to initialize video processing. Please check your internet connection and try again.',
                details: error,
                timestamp: new Date()
            });
        } finally {
            this.isLoading = false;
        }
    }

    private getFFmpegConfig() {
        const isDebug = process.env.NODE_ENV === 'development';
        const deviceInfo = deviceDetector.getDeviceInfo();

        return {
            log: isDebug,
            corePath: '/static/ffmpeg/ffmpeg-core.js',
            wasmPath: '/static/ffmpeg/ffmpeg-core.wasm',
            workerPath: '/static/ffmpeg/ffmpeg-core.worker.js',
            // Optimize for mobile devices
            ...(deviceInfo.isMobile && {
                mainName: 'main',
                // Use smaller memory allocation for mobile
                memory: 64 * 1024 * 1024, // 64MB
            })
        };
    }

    public setProgressCallback(callback: (progress: number) => void): void {
        this.progressCallback = callback;
    }

    public setLogCallback(callback: (message: string) => void): void {
        this.logCallback = callback;
    }

    public isReady(): boolean {
        return this.ffmpeg?.isLoaded() ?? false;
    }

    public async processFiles(
        files: File[],
        options: ProcessingOptions,
        onProgress?: (progress: number) => void
    ): Promise<Blob> {
        if (!this.isReady()) {
            await this.initialize();
        }

        if (!this.ffmpeg) {
            throw new AppError({
                code: 'FFMPEG_NOT_READY',
                message: 'Video processor is not ready. Please try again.',
                timestamp: new Date()
            });
        }

        if (onProgress) {
            this.setProgressCallback(onProgress);
        }

        try {
            // Validate files
            this.validateFiles(files);

            // Sort files by name to ensure correct order
            const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

            // Write input files to FFmpeg filesystem
            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                const fileName = `frame_${i.toString().padStart(4, '0')}.png`;
                const data = await window.FFmpeg.fetchFile(file);
                this.ffmpeg.FS('writeFile', fileName, data);
            }

            // Generate output filename
            const outputFileName = `output.${options.outputFormat}`;

            // Build FFmpeg command based on codec and options
            const command = this.buildFFmpegCommand(sortedFiles.length, options, outputFileName);

            console.log('🎬 Starting video processing:', command.join(' '));

            // Run FFmpeg
            await this.ffmpeg.run(...command);

            // Check if output file exists before reading
            try {
                const files = this.ffmpeg.FS('readdir', '.');
                console.log('FFmpeg output files:', files);

                if (!files.includes(outputFileName)) {
                    throw new Error(`Output file ${outputFileName} was not created`);
                }
            } catch (e) {
                console.error('Failed to check output files:', e);
                throw new Error(`FFmpeg failed to create output file: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }

            // Read output file
            const outputData = this.ffmpeg.FS('readFile', outputFileName);
            const outputBlob = new Blob([outputData.buffer], {
                type: this.getMimeType(options.outputFormat)
            });

            // Cleanup input files
            for (let i = 0; i < sortedFiles.length; i++) {
                const fileName = `frame_${i.toString().padStart(4, '0')}.png`;
                try {
                    this.ffmpeg.FS('unlink', fileName);
                } catch (e) {
                    // File might not exist, ignore
                }
            }

            // Cleanup output file
            try {
                this.ffmpeg.FS('unlink', outputFileName);
            } catch (e) {
                // File might not exist, ignore
            }

            console.log('✅ Video processing completed');
            return outputBlob;

        } catch (error) {
            console.error('❌ Video processing failed:', error);

            // Try to cleanup files even on error
            this.cleanupFiles(files.length);

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError({
                code: 'PROCESSING_FAILED',
                message: 'Video processing failed. Please check your files and try again.',
                details: error,
                timestamp: new Date()
            });
        }
    }

    private validateFiles(files: File[]): void {
        if (files.length === 0) {
            throw new AppError({
                code: 'NO_FILES',
                message: 'Please select at least one PNG image.',
                timestamp: new Date()
            });
        }

        const limits = deviceDetector.getOptimalProcessingSettings();

        if (files.length > limits.maxFrameCount) {
            throw new AppError({
                code: 'TOO_MANY_FILES',
                message: `Too many files. Maximum ${limits.maxFrameCount} frames allowed on this device.`,
                timestamp: new Date()
            });
        }

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const totalSizeMB = totalSize / (1024 * 1024);

        if (totalSizeMB > limits.maxFileSizeMB) {
            throw new AppError({
                code: 'FILES_TOO_LARGE',
                message: `Files too large. Maximum ${limits.maxFileSizeMB}MB allowed on this device.`,
                timestamp: new Date()
            });
        }

        // Validate file types
        for (const file of files) {
            if (!file.type.startsWith('image/png')) {
                throw new AppError({
                    code: 'INVALID_FILE_TYPE',
                    message: `Invalid file type: ${file.name}. Only PNG images are supported.`,
                    timestamp: new Date()
                });
            }
        }
    }

    private buildFFmpegCommand(frameCount: number, options: ProcessingOptions, outputFileName: string): string[] {
        const { fps, codec, quality, scale } = options;

        let command = [
            '-framerate', fps.toString(),
            '-i', 'frame_%04d.png',
            '-y', // Overwrite output file
            '-threads', '0', // Use all available CPU cores
            '-shortest' // End when shortest input ends
        ];

        // Add scaling if specified
        if (scale && (scale.width || scale.height)) {
            let scaleFilter = 'scale=';
            if (scale.width && scale.height) {
                scaleFilter += `${scale.width}:${scale.height}`;
                if (!scale.maintain_aspect_ratio) {
                    scaleFilter += ':force_original_aspect_ratio=disable';
                }
            } else if (scale.width) {
                scaleFilter += `${scale.width}:-1`;
            } else if (scale.height) {
                scaleFilter += `-1:${scale.height}`;
            }
            command.push('-vf', scaleFilter);
        }

        // Add codec-specific options - balanced speed and compatibility
        switch (codec) {
            case 'vp9':
                command.push(
                    '-c:v', 'libvpx-vp9',
                    '-pix_fmt', 'yuva420p',
                    '-deadline', quality === 'best' ? 'good' : 'realtime',
                    '-cpu-used', quality === 'best' ? '1' : '5',  // Balanced settings
                    '-row-mt', '1'  // Enable multithreading
                );
                break;

            case 'vp8':
                command.push(
                    '-c:v', 'libvpx',
                    '-pix_fmt', 'yuva420p',
                    '-deadline', quality === 'best' ? 'good' : 'realtime',
                    '-cpu-used', quality === 'best' ? '1' : '5'
                );
                break;

            case 'h264':
                command.push(
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-preset', quality === 'best' ? 'fast' : 'veryfast'
                );
                break;

            case 'gif':
                // For GIF, we need a two-pass process
                return this.buildGifCommand(fps, outputFileName);

            case 'prores':
                command.push(
                    '-c:v', 'prores_ks',
                    '-profile:v', '4444',
                    '-pix_fmt', 'yuva444p10le'
                );
                break;

            default:
                throw new AppError({
                    code: 'UNSUPPORTED_CODEC',
                    message: `Unsupported codec: ${codec}`,
                    timestamp: new Date()
                });
        }

        command.push(outputFileName);
        return command;
    }

    private buildGifCommand(fps: number, outputFileName: string): string[] {
        // GIF generation is complex and requires palette generation
        // For now, use a simplified approach
        return [
            '-framerate', fps.toString(),
            '-i', 'frame_%04d.png',
            '-vf', `fps=${fps},scale=640:-1:flags=lanczos`,
            '-y',
            outputFileName
        ];
    }

    private getMimeType(format: string): string {
        const mimeTypes: Record<string, string> = {
            'webm': 'video/webm',
            'mp4': 'video/mp4',
            'gif': 'image/gif',
            'mov': 'video/quicktime'
        };

        return mimeTypes[format] || 'application/octet-stream';
    }

    private cleanupFiles(frameCount: number): void {
        if (!this.ffmpeg) return;

        try {
            // Clean up input files
            for (let i = 0; i < frameCount; i++) {
                const fileName = `frame_${i.toString().padStart(4, '0')}.png`;
                try {
                    this.ffmpeg.FS('unlink', fileName);
                } catch (e) {
                    // Ignore errors
                }
            }

            // Clean up potential output files
            const outputFormats = ['webm', 'mp4', 'gif', 'mov'];
            for (const format of outputFormats) {
                try {
                    this.ffmpeg.FS('unlink', `output.${format}`);
                } catch (e) {
                    // Ignore errors
                }
            }
        } catch (error) {
            console.warn('Error during cleanup:', error);
        }
    }

    public cleanup(): void {
        if (this.ffmpeg) {
            try {
                this.ffmpeg.exit();
            } catch (error) {
                console.warn('Error during FFmpeg cleanup:', error);
            }
            this.ffmpeg = null;
        }
        this.progressCallback = null;
        this.logCallback = null;
    }

    public getMemoryUsage(): number {
        // Estimate memory usage in MB
        if (!this.ffmpeg) return 0;

        try {
            // This is a rough estimate
            return 100; // Base FFmpeg overhead
        } catch {
            return 0;
        }
    }
}

// Singleton export
export const ffmpegService = FFmpegService.getInstance();