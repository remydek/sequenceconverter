// Premium Transparent Video Creator - Client-side Processing
// Export the class to make it available globally
window.TransparentVideoCreator = class TransparentVideoCreator {
    constructor() {
        // Initialize without Supabase
        this.supabase = null;
        this.ffmpeg = null;
        this.files = [];
        
        // Initialize the app directly without auth
        this.initEventListeners();
        this.updateFormatOptions();
        this.showMainApp();
    }
    
    initSupabase() {
        // Removed
    }
    
    async checkAuth() {
        // Removed
    }
    
    async loadUserProfile() {
        // Removed
    }
    
    async createUserProfile() {
        // Removed
    }
    
    async loadUsageStats() {
        // Removed
    }
    
    async logUsage(actionType, frameCount, outputFormat) {
        // Removed
    }
    
    async updateUI() {
        // Show premium features by default
        document.getElementById('tier-status').textContent = 'Premium Features';
        document.getElementById('usage-stats').innerHTML = 'Enjoy full access to all features!';
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('user-section').classList.remove('hidden');
    }
    
    showAuthModal() {
        // Removed
    }
    
    showMainApp() {
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }
    
    initEventListeners() {
        // Remove auth-related event listeners
        document.getElementById('upgrade-btn')?.addEventListener('click', () => this.showUpgradeModal());
        document.getElementById('close-upgrade')?.addEventListener('click', closeUpgradeModal);
        
        // File handling
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Processing
        document.getElementById('create-btn').addEventListener('click', () => this.createVideo());
        document.getElementById('try-again').addEventListener('click', () => this.resetUI());
        document.getElementById('create-another').addEventListener('click', () => this.resetUI());
        document.getElementById('transparency').addEventListener('change', () => this.updateFormatOptions());
        
        // FPS buttons
        const fpsButtons = document.querySelectorAll('.fps-btn');
        fpsButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                fpsButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Update hidden input value
                document.getElementById('fps').value = e.target.dataset.fps;
            });
        });
        
        // Format buttons
        const formatButtons = document.querySelectorAll('.format-btn');
        formatButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Get the parent group
                const parentGroup = e.target.closest('.format-buttons');
                // Remove active class from all buttons in this group
                parentGroup.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Update hidden input value
                document.getElementById('format').value = e.target.dataset.format;
            });
        });
        
        // Quality buttons
        const qualityButtons = document.querySelectorAll('.quality-btn');
        qualityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                qualityButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Update hidden input value
                document.getElementById('quality').value = e.target.dataset.quality;
            });
        });
    }
    
    async signInWithGoogle() {
        // Removed
    }
    
    async signInWithEmail(e) {
        // Removed
    }
    
    async signOut() {
        // Removed
    }
    
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('drop-zone').classList.add('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        document.getElementById('drop-zone').classList.remove('dragover');
        this.handleFiles(e.dataTransfer.files);
    }
    
    handleFiles(fileList) {
        this.files = Array.from(fileList).filter(file => file.type === 'image/png');
        this.files.sort((a, b) => a.name.localeCompare(b.name));
        
        if (this.files.length === 0) {
            this.showErrorModal('No PNG files selected. Please select PNG files only.');
            return;
        }
        
        this.displayFiles();
        this.showSettings();
    }
    
    displayFiles() {
        const container = document.getElementById('files-container');
        const fileList = document.getElementById('file-list');
        const fileCount = document.getElementById('file-count');
        
        container.innerHTML = '';
        fileCount.textContent = this.files.length;
        
        this.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
            `;
            container.appendChild(fileItem);
        });
        
        fileList.classList.remove('hidden');
    }
    
    showSettings() {
        document.getElementById('settings').classList.remove('hidden');
        document.getElementById('create-btn').disabled = false;
    }
    
    async createVideo() {
        // No authentication required;
        
        // Check usage limits for free users
        // Removed
        
        this.showProgress();
        this.updateProgress(0, 'Initializing...');
        
        try {
            // Explicitly check and initialize FFmpeg if not ready
            if (!this.ffmpeg || !this.ffmpeg.isLoaded()) {
                console.log('DIAGNOSTIC (createVideo): FFmpeg not ready or not loaded. Calling initFFmpeg().');
                const ffmpegReady = await this.initFFmpeg(); // initFFmpeg has its own detailed logs
                if (!ffmpegReady || !this.ffmpeg || !this.ffmpeg.isLoaded()) { // Double check after init
                    console.error('CRITICAL (createVideo): initFFmpeg completed but FFmpeg still not ready.');
                    throw new Error("FFmpeg could not be initialized properly. Please refresh and try again.");
                }
                console.log('DIAGNOSTIC (createVideo): initFFmpeg completed successfully. FFmpeg should be ready.');
            } else {
                console.log('DIAGNOSTIC (createVideo): FFmpeg already loaded and ready.');
            }

            console.log('DIAGNOSTIC (createVideo): initFFmpeg has completed.');
            this.updateProgress(20, 'FFmpeg initialized. Preparing video...');
            await this.processVideo();

        } catch (error) {
            console.error('Error in createVideo:', error);
            // Ensure error message is user-friendly and specific if possible
            let errorMessage = error.message || "An unknown error occurred during video creation.";
            if (error.message && (error.message.includes("FFmpeg lost state") || error.message.includes("FFmpeg could not be initialized"))) {
                errorMessage = "FFmpeg initialization failed. Please refresh the page and try again. If the problem persists, check browser console for details.";
            } else if (error.message && error.message.includes("ffmpeg.wasm is not ready")) {
                errorMessage = "FFmpeg core error: Component not ready. Please refresh and try again.";
            }
            this.showError(errorMessage);
            this.updateProgress(0, 'Error. Please try again.');
        }
    }
    
    async initFFmpeg() {
        console.log('[DIAGNOSTIC] Checking SharedArrayBuffer in initFFmpeg. typeof SharedArrayBuffer:', typeof SharedArrayBuffer);
        if (this.ffmpeg) {
            console.log('FFmpeg already initialized.');
            return true;
        }
        
        this.updateProgress(10, 'Loading FFmpeg...');
        console.log('Attempting to initialize FFmpeg...');
        
        try {
            // Check if FFmpeg is available from the HTML module loading
            console.log('Checking for window.FFmpeg and window.FFmpeg.createFFmpeg...');
            if (!window.FFmpeg || !window.FFmpeg.createFFmpeg) {
                console.error('FFmpeg global object or createFFmpeg function not found.');
                throw new Error('FFmpeg library not loaded from HTML. Please refresh the page.');
            }
            console.log('createFFmpeg function found.');
            
            console.log('Creating FFmpeg instance...');
            const { createFFmpeg, fetchFile } = window.FFmpeg;
            
            console.log('DIAGNOSTIC: Checking SharedArrayBuffer availability...');
            if (typeof SharedArrayBuffer === 'function') {
                console.log('DIAGNOSTIC: SharedArrayBuffer IS AVAILABLE.');
            } else {
                console.error('CRITICAL: SharedArrayBuffer IS NOT AVAILABLE. FFmpeg will likely fail or run in a slower, single-threaded mode.');
            }

            console.log('Calling createFFmpeg()...');
            this.ffmpeg = createFFmpeg({
                log: true,
                logger: ({ type, message }) => { console.log(`[FFmpeg ${type.toUpperCase()}] ${message}`); },
                progress: ({ ratio }) => {
                    const percent = Math.round(ratio * 100);
                    const uiProgress = 10 + Math.min(80, Math.round(ratio * 70)); // Maps 0-1 to 10%-80% of our bar
                    this.updateProgress(uiProgress, `Loading FFmpeg core (${percent}%)...`);
                }
                // All path options (corePath, wasmPath, workerPath, mainName) are removed.
                // Relying on default mechanism to find core files relative to ffmpeg.min.js script location.
            });
            console.log('createFFmpeg() returned. FFmpeg instance:', this.ffmpeg);
            
            this.fetchFile = fetchFile;
            
            console.log('Attempting to call this.ffmpeg.load()...');
            await this.ffmpeg.load();
            console.log('this.ffmpeg.load() completed successfully.');

            // Explicitly check if FFmpeg reports itself as loaded
            if (!this.ffmpeg.isLoaded()) {
                console.error('CRITICAL: ffmpeg.load() completed, but ffmpeg.isLoaded() is false!');
                this.ffmpeg = null; // Ensure it's null so re-init is attempted if user tries again
                throw new Error('FFmpeg reported loading complete, but is not in a ready state. Core files might be missing or inaccessible.');
            }
            console.log('DIAGNOSTIC: ffmpeg.isLoaded() is true after load(). FFmpeg should be ready.');

            console.log('DIAGNOSTIC: Adding a 100ms delay after load() to allow worker to potentially settle...');
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            console.log('DIAGNOSTIC: Delay completed. Proceeding to mark FFmpeg as loaded.');

            this.updateProgress(90, 'FFmpeg loaded successfully')
            return true;
        } catch (error) {
            console.error('Error during FFmpeg initialization in initFFmpeg:', error);
            this.ffmpeg = null; 
            this.showError(`FFmpeg initialization failed: ${error.message}. Please refresh and try again.`);
            this.updateProgress(0, 'FFmpeg Init Failed');
            return false; 
        }
    }

    async processVideo() {
        const fps = document.getElementById('fps').value;
        const format = document.getElementById('format').value;
        const quality = document.getElementById('quality').value;
        
        this.updateProgress(25, 'Writing files to memory...');
        
        try {
            if (!this.ffmpeg || typeof this.ffmpeg.FS !== 'function') {
                console.error('CRITICAL: FFmpeg instance or FS method not available at the start of processVideo.');
                this.ffmpeg = null; 
                throw new Error('FFmpeg lost state before processing. Please try creating the video again.');
            }
            console.log('DIAGNOSTIC: FFmpeg instance and FS appear available at the start of processVideo.');

            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const fileName = `frame_${String(i + 1).padStart(4, '0')}.png`;
                const fileData = await this.fileToUint8Array(file);
                try {
                    console.log(`DIAGNOSTIC: Attempting FS.writeFile for ${fileName}. Current isLoaded: ${this.ffmpeg.isLoaded()}`);
                    this.ffmpeg.FS('writeFile', fileName, fileData);
                    console.log(`DIAGNOSTIC: FS.writeFile for ${fileName} succeeded.`);
                } catch (fsWriteError) {
                    console.error(`ERROR during specific FS.writeFile call for ${fileName}:`, fsWriteError);
                    if (this.ffmpeg && !this.ffmpeg.isLoaded()) {
                         console.error('CRITICAL: FFmpeg became unloaded during FS.writeFile loop.');
                    }
                    throw fsWriteError; 
                }
            }
            console.log('DIAGNOSTIC (processVideo): All files written to memory.');
            this.updateProgress(40, 'Running FFmpeg command...');
            
            let actualExtension;
            switch (format) {
                case 'gif': actualExtension = 'gif'; break;
                case 'webm_transparent': actualExtension = 'webm'; break;
                case 'webm_standard': actualExtension = 'webm'; break;
                case 'mp4_h264': actualExtension = 'mp4'; break;
                default:
                    console.error(`Unsupported format selected: ${format}`);
                    throw new Error(`Unsupported format: ${format}. Please select a valid format.`);
            }
            const outputFile = `output.${actualExtension}`;

            const args = [];
            
            switch (format) {
                case 'gif':
                    // Two-pass GIF with transparency
                    const paletteFile = 'palette.png';
                    await this.ffmpeg.run('-framerate', fps, '-i', 'frame_%04d.png', '-vf', `fps=${fps},scale=640:-1:flags=lanczos,palettegen=stats_mode=diff:transparency_color=ffffff`, paletteFile);
                    await this.ffmpeg.run('-framerate', fps, '-i', 'frame_%04d.png', '-i', paletteFile, '-lavfi', `fps=${fps},scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, '-gifflags', '+transdiff', outputFile);
                    break;
                case 'webm_transparent':
                    args.push('-framerate', fps, '-i', 'frame_%04d.png', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', quality === 'high' ? '15' : '25', '-auto-alt-ref', '0', outputFile);
                    break;
                case 'webm_standard':
                    args.push('-framerate', fps, '-i', 'frame_%04d.png', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', quality === 'high' ? '15' : '25', outputFile);
                    break;
                case 'mp4_h264':
                    args.push('-framerate', fps, '-i', 'frame_%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', quality === 'high' ? '18' : '23', outputFile);
                    break;
            }
            
            if (args.length > 0) {
                console.log('DIAGNOSTIC (processVideo): Executing ffmpeg.run with args:', args);
                await this.ffmpeg.run(...args);
                console.log('DIAGNOSTIC (processVideo): ffmpeg.run completed.');
            }

            this.updateProgress(90, 'Finalizing video...');

            // Read and create blob from output file
            const data = this.ffmpeg.FS('readFile', outputFile); // outputFile is e.g. output.webm
            const blob = new Blob([data.buffer], { type: this.getMimeType(outputFile) });

            // Log usage if user is authenticated
            // Removed

            this.showResult(blob, outputFile);
            this.updateUI(); // Refresh usage display

        } catch (error) {
            console.error('Video processing error in processVideo:', error);
            this.updateProgress(100, `Error: ${error.message.substring(0, 50)}...`);
            this.showError(`Failed to process video: ${error.message}`);
            // Ensure FFmpeg instance is cleaned up if it exists to allow re-initialization on retry
            if (this.ffmpeg && this.ffmpeg.exit) {
                try {
                    this.ffmpeg.exit();
                } catch (e) {
                    console.warn('Error trying to exit FFmpeg instance:', e);
                }
            }
            this.ffmpeg = null; // Allow re-initialization
        }
    }

    getMimeType(filename) {
        if (filename.endsWith('.webm')) return 'video/webm';
        if (filename.endsWith('.mp4')) return 'video/mp4';
        if (filename.endsWith('.gif')) return 'image/gif';
        return 'application/octet-stream';
    }
    
    async fileToUint8Array(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                resolve(uint8Array);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    updateFormatOptions() {
        const transparency = document.getElementById('transparency').checked;
        const transparentGroup = document.getElementById('format-group-transparent');
        const standardGroup = document.getElementById('format-group-standard');
        const formatInput = document.getElementById('format');
        
        // Update toggle labels
        const toggleLabels = document.querySelectorAll('.toggle-option');
        if (toggleLabels.length === 2) {
            toggleLabels[0].classList.toggle('active', !transparency);
            toggleLabels[1].classList.toggle('active', transparency);
        }
        
        // Show/hide format groups based on transparency selection
        if (transparency) {
            transparentGroup.classList.remove('hidden');
            standardGroup.classList.add('hidden');
            
            // Set default format for transparency
            const activeTransparentBtn = transparentGroup.querySelector('.format-btn.active') || 
                                        transparentGroup.querySelector('.format-btn');
            if (activeTransparentBtn) {
                activeTransparentBtn.classList.add('active');
                formatInput.value = activeTransparentBtn.dataset.format;
            } else {
                formatInput.value = 'webm_transparent';
            }
        } else {
            transparentGroup.classList.add('hidden');
            standardGroup.classList.remove('hidden');
            
            // Set default format for standard
            const activeStandardBtn = standardGroup.querySelector('.format-btn.active') || 
                                    standardGroup.querySelector('.format-btn');
            if (activeStandardBtn) {
                activeStandardBtn.classList.add('active');
                formatInput.value = activeStandardBtn.dataset.format;
            } else {
                formatInput.value = 'mp4_h264';
            }
        }
        
        // Update the format label to be more descriptive
        const formatLabel = transparentGroup.previousElementSibling;
        if (formatLabel && formatLabel.tagName === 'LABEL') {
            formatLabel.textContent = transparency ? 'Transparent Format' : 'Video Format';
        }
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = text;
        }
        console.log(`Progress: ${percent}% - ${text}`); // Also log it for debugging
    }

    showProgress() {
        // Hide other main sections before showing progress
        document.getElementById('result-section').classList.add('hidden');
        document.getElementById('error-section').classList.add('hidden');
        // Show the progress overlay
        document.getElementById('progress-overlay').classList.remove('hidden');
    }

    showError(message) {
        // Hide progress overlay
        document.getElementById('progress-overlay').classList.add('hidden');
        
        console.error("App Error:", message);
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-section').classList.remove('hidden');
    }
    
    showResult(blob, filename) {
        // Hide progress overlay
        document.getElementById('progress-overlay').classList.add('hidden');
        
        // Create URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Update result section
        const resultVideo = document.getElementById('result-video');
        const downloadBtn = document.getElementById('download-btn');
        
        // Set video source or image source based on file type
        if (filename.endsWith('.gif')) {
            // For GIFs, use an image element
            resultVideo.innerHTML = `<img src="${url}" alt="Generated GIF" class="result-media">`;
        } else {
            // For videos, use a video element with controls
            resultVideo.innerHTML = `<video src="${url}" controls autoplay loop class="result-media"></video>`;
        }
        
        // Update download button
        downloadBtn.onclick = () => {
            // Create a temporary anchor element for downloading
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        
        // Show the result section
        document.getElementById('result-section').classList.remove('hidden');
        
        // Update progress to complete
        this.updateProgress(100, 'Video created successfully!');
        
        // Trigger confetti celebration!
        this.triggerConfetti();
    }
    
    // Trigger confetti animation from both sides of the screen
    triggerConfetti() {
        // Check if confetti library is loaded
        if (typeof confetti !== 'function') {
            console.warn('Confetti library not loaded');
            return;
        }
        
        // Left side confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0, y: 0.6 },
            angle: 60,
            startVelocity: 30,
            colors: ['#5D3FD3', '#43B0F1', '#E6425E', '#00C2A8', '#FFC300']
        });
        
        // Right side confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 1, y: 0.6 },
            angle: 120,
            startVelocity: 30,
            colors: ['#5D3FD3', '#43B0F1', '#E6425E', '#00C2A8', '#FFC300']
        });
    }
    
    showUpgradeModal() {
        document.getElementById('upgrade-modal').classList.remove('hidden');
    }
    
    hideAllSections() {
        ['progress-section', 'result-section', 'error-section'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
    }
    
    resetUI() {
        this.hideAllSections();
        document.getElementById('file-list').classList.add('hidden');
        document.getElementById('settings').classList.add('hidden');
        this.files = [];
    }
}

// Close upgrade modal
function closeUpgradeModal() {
    document.getElementById('upgrade-modal').classList.add('hidden');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TransparentVideoCreator();
});

// Handle auth state changes
window.addEventListener('hashchange', () => {
    // Handle OAuth redirects
    if (window.location.hash.includes('access_token')) {
        // Clear the hash to avoid repeated processing
        const cleanUrl = window.location.href.split('#')[0];
        window.history.replaceState(null, document.title, cleanUrl);
        
        // Reload the page to process the authentication
        window.location.reload();
    }
});
