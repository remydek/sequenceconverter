/**
 * Main Transparent Video Creator Application
 * TypeScript implementation with mobile responsiveness and modern features
 */

import {
    AppConfig,
    ProcessingOptions,
    ProcessingJob,
    UIState,
    AppErrorData,
    AnalyticsEvent
} from './types';
import { AppError } from './utils/errors';
import { ffmpegService } from './services/ffmpeg';
import { deviceDetector, addResponsiveClasses } from './utils/device';

class TransparentVideoApp {
    private config: AppConfig | null = null;
    private state: UIState = {
        isProcessing: false,
        currentStep: 'upload',
        selectedFiles: [],
        processingOptions: {
            fps: 24,
            codec: 'vp9',
            quality: 'good',
            outputFormat: 'webm'
        },
        errors: [],
        toast: null
    };

    private elements: Record<string, HTMLElement | null> = {};

    constructor() {
        this.bindMethods();
    }

    private bindMethods(): void {
        // Bind methods to preserve 'this' context
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.handleStartProcessing = this.handleStartProcessing.bind(this);
        this.handleDownload = this.handleDownload.bind(this);
        this.onProgress = this.onProgress.bind(this);
    }

    public async init(): Promise<void> {
        console.log('🎬 Initializing Transparent Video Creator v2.0...');

        try {
            // Add responsive classes based on device
            addResponsiveClasses();

            // Load configuration
            await this.loadConfig();

            // Initialize services
            await this.initializeServices();

            // Set up DOM elements and event listeners
            this.setupDOM();

            // Set device-optimized defaults
            this.applyDeviceOptimizations();

            // Update UI based on initial state
            this.updateUI();

            console.log('✅ Application initialized successfully');

            // Track initialization
            this.trackEvent('app_initialized', {
                device_type: deviceDetector.getDeviceInfo(),
                features_enabled: this.config?.features
            });

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showError(error instanceof AppError ? error : new AppError({
                code: 'INIT_FAILED',
                message: 'Failed to initialize the application. Please refresh the page.',
                details: error,
                timestamp: new Date()
            }));
        }
    }

    private async loadConfig(): Promise<void> {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.config = await response.json();
            console.log('📋 Configuration loaded:', this.config);
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Use fallback config
            this.config = {
                environment: 'development',
                features: {
                    clientSideProcessing: true,
                    premiumFeatures: false,
                    usageTracking: false,
                    fileUploads: false,
                    authRequiredForDownload: false
                },
                limits: {
                    maxFileSizeMB: 100,
                    maxProcessingTimeSeconds: 300,
                    maxFrameCount: 500,
                    supportedFormats: ['webm', 'gif']
                }
            };
        }
    }


    private async initializeServices(): Promise<void> {
        if (!this.config) return;

        // Initialize FFmpeg for client-side processing
        if (this.config.features.clientSideProcessing) {
            // Don't initialize FFmpeg immediately to improve startup time
            // It will be initialized when needed
            console.log('📹 FFmpeg will be loaded when needed');
        }
    }

    private setupDOM(): void {
        // Cache DOM elements
        this.elements = {
            fileInput: document.getElementById('file-input'),
            dropzone: document.getElementById('dropzone'),
            fileList: document.getElementById('file-list'),
            processingOptions: document.getElementById('processing-options'),
            startButton: document.getElementById('start-processing'),
            progressContainer: document.getElementById('progress-container'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            resultsContainer: document.getElementById('results-container'),
            downloadButton: document.getElementById('download-button'),
            errorContainer: document.getElementById('error-container'),
            toastContainer: document.getElementById('toast-container')
        };

        // Set up event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // File input handling
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', this.handleFileSelect);
        }

        // Drag and drop
        if (this.elements.dropzone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.elements.dropzone!.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.elements.dropzone!.addEventListener(eventName, this.highlight.bind(this), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.elements.dropzone!.addEventListener(eventName, this.unhighlight.bind(this), false);
            });

            this.elements.dropzone.addEventListener('drop', this.handleDrop.bind(this), false);
        }

        // Processing controls
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', this.handleStartProcessing);
        }

        if (this.elements.downloadButton) {
            this.elements.downloadButton.addEventListener('click', this.handleDownload);
        }


        // Processing options
        this.setupProcessingOptionsHandlers();

        // Error handling
        document.addEventListener('click', (e) => {
            if ((e.target as Element).classList.contains('error-close')) {
                this.clearErrors();
            }
        });

        // Mobile-specific handlers
        if (deviceDetector.isMobile()) {
            this.setupMobileHandlers();
        }
    }

    private setupProcessingOptionsHandlers(): void {
        const fpsSelect = document.getElementById('fps-select') as HTMLSelectElement;
        const codecSelect = document.getElementById('codec-select') as HTMLSelectElement;
        const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;

        if (fpsSelect) {
            fpsSelect.addEventListener('change', (e) => {
                this.state.processingOptions.fps = parseInt((e.target as HTMLSelectElement).value);
            });
        }

        if (codecSelect) {
            codecSelect.addEventListener('change', (e) => {
                const codec = (e.target as HTMLSelectElement).value as ProcessingOptions['codec'];
                this.state.processingOptions.codec = codec;
                this.state.processingOptions.outputFormat = this.getOutputFormat(codec) as ProcessingOptions['outputFormat'];
                this.updateCodecOptions();
            });
        }

        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.state.processingOptions.quality = (e.target as HTMLSelectElement).value as ProcessingOptions['quality'];
            });
        }
    }

    private setupMobileHandlers(): void {
        // Add touch-friendly interactions
        document.addEventListener('touchstart', () => {}, { passive: true });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // Prevent zoom on double tap for specific elements
        const preventZoom = (e: Event) => {
            e.preventDefault();
        };

        document.querySelectorAll('button, input, select').forEach(element => {
            element.addEventListener('touchend', preventZoom);
        });
    }

    private preventDefaults(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }

    private highlight(): void {
        this.elements.dropzone?.classList.add('drag-over');
    }

    private unhighlight(): void {
        this.elements.dropzone?.classList.remove('drag-over');
    }

    private handleDrop(e: DragEvent): void {
        const dt = e.dataTransfer;
        const files = Array.from(dt?.files || []);
        this.processSelectedFiles(files);
    }

    private handleFileSelect(e: Event): void {
        const input = e.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        this.processSelectedFiles(files);
    }

    private processSelectedFiles(files: File[]): void {
        // Filter for PNG files only
        const pngFiles = files.filter(file => file.type === 'image/png');

        if (pngFiles.length === 0) {
            this.showError(new AppError({
                code: 'NO_PNG_FILES',
                message: 'Please select PNG image files only.',
                timestamp: new Date()
            }));
            return;
        }

        if (pngFiles.length !== files.length) {
            this.showToast('Some files were ignored. Only PNG images are supported.', 'warning');
        }

        // Check file count limits
        const limits = deviceDetector.getOptimalProcessingSettings();
        if (pngFiles.length > limits.maxFrameCount) {
            this.showError(new AppError({
                code: 'TOO_MANY_FILES',
                message: `Too many files. Maximum ${limits.maxFrameCount} frames allowed on this device.`,
                timestamp: new Date()
            }));
            return;
        }

        // Sort files by name for correct sequence
        pngFiles.sort((a, b) => a.name.localeCompare(b.name));

        this.state.selectedFiles = pngFiles;
        this.state.currentStep = 'configure';
        this.updateUI();

        this.trackEvent('files_selected', {
            file_count: pngFiles.length,
            total_size: pngFiles.reduce((sum, f) => sum + f.size, 0)
        });
    }

    private async handleStartProcessing(): Promise<void> {
        if (this.state.selectedFiles.length === 0) {
            this.showError(new AppError({
                code: 'NO_FILES_SELECTED',
                message: 'Please select files first.',
                timestamp: new Date()
            }));
            return;
        }

        // Authentication is not required for processing - only for downloading


        this.state.isProcessing = true;
        this.state.currentStep = 'processing';
        this.updateUI();

        try {
            console.log('🎬 Starting video processing...');

            const startTime = performance.now();
            const outputBlob = await ffmpegService.processFiles(
                this.state.selectedFiles,
                this.state.processingOptions,
                this.onProgress
            );
            const processingTime = performance.now() - startTime;

            // Create download URL
            const downloadUrl = URL.createObjectURL(outputBlob);

            // Update state with results
            this.state.currentJob = {
                id: Date.now().toString(),
                status: 'completed',
                progress: 100,
                files: this.state.selectedFiles,
                options: this.state.processingOptions,
                createdAt: new Date(),
                updatedAt: new Date(),
                completedAt: new Date(),
                outputBlob,
                outputSize: outputBlob.size,
                processingTime: processingTime / 1000
            };

            this.state.currentStep = 'complete';
            this.state.isProcessing = false;

            // Set up download
            this.setupDownload(downloadUrl, outputBlob);

            this.trackEvent('processing_completed', {
                processing_time: processingTime,
                output_size: outputBlob.size,
                frame_count: this.state.selectedFiles.length,
                codec: this.state.processingOptions.codec
            });

            this.showToast('Video processing completed!', 'success');

        } catch (error) {
            console.error('Processing failed:', error);
            this.state.isProcessing = false;
            this.state.currentStep = 'error';

            const appError = error instanceof AppError ? error : new AppError({
                code: 'PROCESSING_FAILED',
                message: 'Video processing failed. Please try again.',
                details: error,
                timestamp: new Date()
            });

            this.showError(appError);
            this.trackEvent('processing_failed', { error: appError.code });
        }

        this.updateUI();
    }

    private onProgress(progress: number): void {
        this.state.currentJob = {
            ...this.state.currentJob!,
            progress,
            updatedAt: new Date()
        };
        this.updateProgressUI(progress);
    }

    private setupDownload(url: string, blob: Blob): void {
        // Set up the hidden download link
        const hiddenLink = document.getElementById('hidden-download-link') as HTMLAnchorElement;
        if (hiddenLink) {
            hiddenLink.href = url;
            hiddenLink.download = `transparent_video_${Date.now()}.${this.state.processingOptions.outputFormat}`;
        }
    }

    private async handleDownload(): Promise<void> {
        // Direct download without any authentication
        if (!this.state.currentJob?.outputBlob) {
            this.showToast('No video file available for download', 'error');
            return;
        }

        // Create blob URL and trigger download directly
        const blob = this.state.currentJob.outputBlob;
        const url = URL.createObjectURL(blob);
        const filename = `transparent_video_${Date.now()}.${this.state.processingOptions.outputFormat}`;

        // Create temporary download link and trigger it
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up the blob URL
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        this.showToast('Video downloaded successfully!', 'success');
    }







    private applyDeviceOptimizations(): void {
        const limits = deviceDetector.getOptimalProcessingSettings();

        // Update processing options based on device
        this.state.processingOptions = {
            ...this.state.processingOptions,
            fps: limits.recommendedFPS,
            quality: limits.defaultQuality,
            codec: deviceDetector.getRecommendedCodec() as any
        };

        // Update UI elements with device-appropriate values
        const fpsSelect = document.getElementById('fps-select') as HTMLSelectElement;
        const codecSelect = document.getElementById('codec-select') as HTMLSelectElement;
        const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;

        if (fpsSelect) {
            fpsSelect.value = limits.recommendedFPS.toString();
        }

        if (codecSelect) {
            codecSelect.value = this.state.processingOptions.codec;
            this.updateCodecOptions();
        }

        if (qualitySelect) {
            qualitySelect.value = limits.defaultQuality;
        }

        // Show device-specific tips
        this.showDeviceTips(limits);
    }

    private showDeviceTips(limits: any): void {
        const tipsElement = document.getElementById('device-tips');
        if (!tipsElement) return;

        let tips = '';
        if (deviceDetector.isMobile()) {
            tips = `📱 Mobile optimized: Max ${limits.maxFrameCount} frames, ${limits.maxFileSizeMB}MB limit`;
        } else if (deviceDetector.isTablet()) {
            tips = `📱 Tablet optimized: Max ${limits.maxFrameCount} frames, ${limits.maxFileSizeMB}MB limit`;
        }

        if (tips) {
            tipsElement.textContent = tips;
            tipsElement.style.display = 'block';
        }
    }

    private updateUI(): void {
        this.updateStepUI();
        this.updateFileListUI();
        this.updateProcessingOptionsUI();
        this.updateProgressUI();
        this.updateResultsUI();
        this.updateErrorUI();
    }

    private updateStepUI(): void {
        // Update timeline steps
        document.querySelectorAll('.timeline-step').forEach(step => {
            const stepName = step.getAttribute('data-step');
            const stepNames = ['upload', 'configure', 'processing', 'complete'];
            const currentStepIndex = stepNames.indexOf(this.state.currentStep);
            const stepIndex = stepNames.indexOf(stepName || '');

            // Reset all classes
            step.classList.remove('active', 'completed', 'pending', 'processing');

            if (stepIndex < currentStepIndex) {
                step.classList.add('completed');
            } else if (stepIndex === currentStepIndex) {
                if (this.state.currentStep === 'processing') {
                    step.classList.add('processing');
                } else {
                    step.classList.add('active');
                }
            } else {
                step.classList.add('pending');
            }
        });

        // Show/hide sections based on current step
        document.querySelectorAll('.step-section').forEach(section => {
            const stepName = section.getAttribute('data-step');
            if (stepName === this.state.currentStep) {
                section.classList.add('active');
                section.classList.remove('hidden');
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        });
    }

    private updateFileListUI(): void {
        const fileList = this.elements.fileList;
        if (!fileList) return;

        if (this.state.selectedFiles.length === 0) {
            fileList.innerHTML = '<p class="no-files">No files selected</p>';
            return;
        }

        const totalSize = this.state.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

        fileList.innerHTML = `
            <div class="file-summary">
                <h3>${this.state.selectedFiles.length} files selected</h3>
                <p>Total size: ${totalSizeMB} MB</p>
            </div>
            <div class="file-list-items">
                ${this.state.selectedFiles.slice(0, 5).map((file, index) => `
                    <div class="file-item">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                `).join('')}
                ${this.state.selectedFiles.length > 5 ? `
                    <div class="file-item more-files">
                        ... and ${this.state.selectedFiles.length - 5} more files
                    </div>
                ` : ''}
            </div>
        `;
    }

    private updateProcessingOptionsUI(): void {
        // This is handled by event listeners, but we can update display values here
        const codecSelect = document.getElementById('codec-select') as HTMLSelectElement;
        if (codecSelect) {
            codecSelect.value = this.state.processingOptions.codec;
        }
    }

    private updateProgressUI(progress?: number): void {
        const progressContainer = this.elements.progressContainer;
        const progressBar = this.elements.progressBar;
        const progressText = this.elements.progressText;

        if (!progressContainer || !progressBar || !progressText) return;

        if (this.state.isProcessing) {
            progressContainer.style.display = 'block';
            const currentProgress = progress ?? this.state.currentJob?.progress ?? 0;
            (progressBar as HTMLElement).style.width = `${currentProgress}%`;
            progressText.textContent = `Processing... ${currentProgress}%`;
        } else {
            progressContainer.style.display = 'none';
        }
    }

    private updateResultsUI(): void {
        const resultsContainer = this.elements.resultsContainer;
        if (!resultsContainer) return;

        if (this.state.currentStep === 'complete' && this.state.currentJob) {
            resultsContainer.style.display = 'block';

            const job = this.state.currentJob;
            const sizeKB = ((job.outputSize || 0) / 1024).toFixed(1);
            const processingTime = (job.processingTime || 0).toFixed(1);

            resultsContainer.innerHTML = `
                <div class="card-header text-center">
                    <h2 class="card-title">✅ Processing Complete!</h2>
                    <p class="card-text">Your transparent video is ready for download</p>
                </div>

                <div class="card-body text-center">
                    <div class="results-info mb-8">
                        <div class="stats grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
                            <div class="stat bg-background-secondary rounded-lg p-4">
                                <div class="text-sm text-text-muted mb-1">Output size</div>
                                <div class="text-xl font-semibold">${sizeKB} KB</div>
                            </div>
                            <div class="stat bg-background-secondary rounded-lg p-4">
                                <div class="text-sm text-text-muted mb-1">Processing time</div>
                                <div class="text-xl font-semibold">${processingTime}s</div>
                            </div>
                            <div class="stat bg-background-secondary rounded-lg p-4">
                                <div class="text-sm text-text-muted mb-1">Format</div>
                                <div class="text-xl font-semibold">${this.state.processingOptions.outputFormat.toUpperCase()}</div>
                            </div>
                        </div>
                    </div>

                    <div class="download-section flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button id="download-button" class="btn btn-primary btn-large" type="button">
                            📥 Download Video
                        </button>
                        <button class="btn btn-secondary" onclick="location.reload()">
                            🔄 Process Another Video
                        </button>
                    </div>
                    <a id="hidden-download-link" style="display: none;" href="" download=""></a>
                </div>
            `;

            // Re-attach download handler
            const downloadBtn = resultsContainer.querySelector('#download-button');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', this.handleDownload);
                this.elements.downloadButton = downloadBtn as HTMLElement;
            }
        } else {
            resultsContainer.style.display = 'none';
        }
    }


    private updateErrorUI(): void {
        const errorContainer = this.elements.errorContainer;
        if (!errorContainer) return;

        if (this.state.errors.length > 0) {
            errorContainer.innerHTML = this.state.errors.map(error => `
                <div class="error-item">
                    <div class="error-message">
                        <strong>${error.code}:</strong> ${error.message}
                    </div>
                    <button class="error-close" title="Dismiss">×</button>
                </div>
            `).join('');
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }

    private updateCodecOptions(): void {
        const codec = this.state.processingOptions.codec;
        const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;

        if (!qualitySelect) return;

        // Update available quality options based on codec
        if (codec === 'gif') {
            qualitySelect.innerHTML = '<option value="good">Standard</option>';
            qualitySelect.disabled = true;
        } else {
            qualitySelect.innerHTML = `
                <option value="realtime">Fast</option>
                <option value="good">Good</option>
                <option value="best">Best</option>
            `;
            qualitySelect.disabled = false;
            qualitySelect.value = this.state.processingOptions.quality;
        }
    }

    private getOutputFormat(codec: string): 'webm' | 'mp4' | 'gif' | 'mov' {
        const formatMap: Record<string, 'webm' | 'mp4' | 'gif' | 'mov'> = {
            'vp9': 'webm',
            'vp8': 'webm',
            'h264': 'mp4',
            'gif': 'gif',
            'prores': 'mov'
        };
        return formatMap[codec] || 'webm';
    }

    private handleOrientationChange(): void {
        // Refresh layout calculations
        this.updateUI();

        // Show orientation-specific tips
        if (window.orientation === 90 || window.orientation === -90) {
            this.showToast('Landscape mode: Better for viewing results', 'info');
        }
    }

    private showError(error: AppError): void {
        console.error('App Error:', error);
        this.state.errors.push({
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: error.timestamp
        });
        this.updateErrorUI();

        // Also show as toast for immediate feedback
        this.showToast(error.message, 'error');
    }

    private clearErrors(): void {
        this.state.errors = [];
        this.updateErrorUI();
    }

    private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info', duration = 5000): void {
        this.state.toast = { message, type, visible: true };

        const toastContainer = this.elements.toastContainer;
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">×</button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        // Manual dismiss
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }

    private trackEvent(event: string, properties?: Record<string, any>): void {
        if (!this.config?.features.usageTracking) return;

        const eventData: AnalyticsEvent = {
            event,
            properties,
            timestamp: new Date(),
            user_id: undefined,
            session_id: sessionStorage.getItem('session_id') || 'anonymous'
        };

        // Send to backend
        fetch('/api/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        }).catch(error => {
            console.warn('Failed to track event:', error);
        });
    }

    public cleanup(): void {
        // Clean up services
        ffmpegService.cleanup();

        // Clean up object URLs
        if (this.state.currentJob?.outputBlob) {
            URL.revokeObjectURL((this.elements.downloadButton as HTMLAnchorElement)?.href);
        }

        // Clear state
        this.state = {
            isProcessing: false,
            currentStep: 'upload',
            selectedFiles: [],
            processingOptions: {
                fps: 24,
                codec: 'vp9',
                quality: 'good',
                outputFormat: 'webm'
            },
            errors: [],
            toast: null
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new TransparentVideoApp();

    try {
        await app.init();

        // Make app globally available for debugging
        (window as any).app = app;

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            app.cleanup();
        });

    } catch (error) {
        console.error('Failed to start application:', error);
        document.body.innerHTML = `
            <div class="error-page">
                <h1>⚠️ Application Failed to Start</h1>
                <p>Please refresh the page and try again.</p>
                <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
            </div>
        `;
    }
});

export default TransparentVideoApp;