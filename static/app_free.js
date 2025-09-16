/**
 * Free Transparent Video Creator
 * Client-side video processing with FFmpeg.wasm
 * Auth only required for downloads
 */

class TransparentVideoApp {
    constructor() {
        // Initialize properties
        this.files = [];
        this.ffmpeg = null;
        this.videoBlob = null;
        this.currentUser = null;
        
        // Supabase config - Replace with your actual credentials
        this.supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
        this.supabaseKey = 'YOUR_ANON_KEY';
        this.supabase = null;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('Initializing Transparent Video Creator...');
        
        // Initialize Supabase
        if (typeof window.supabase !== 'undefined') {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            await this.checkAuth();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize FFmpeg
        await this.initFFmpeg();
    }
    
    async initFFmpeg() {
        try {
            const { createFFmpeg, fetchFile } = FFmpeg;
            this.ffmpeg = createFFmpeg({
                log: false, // Set to true for debugging
                corePath: '/static/ffmpeg/ffmpeg-core.js',
                progress: (p) => this.onProgress(p)
            });
            
            // Load FFmpeg when user starts processing (lazy loading)
            console.log('FFmpeg initialized (will load on first use)');
        } catch (error) {
            console.error('Failed to initialize FFmpeg:', error);
            this.showError('Failed to initialize video processor. Please refresh the page.');
        }
    }
    
    setupEventListeners() {
        // File handling
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Buttons
        document.getElementById('clearFiles')?.addEventListener('click', () => this.clearFiles());
        document.getElementById('processBtn')?.addEventListener('click', () => this.processVideo());
        document.getElementById('downloadBtn')?.addEventListener('click', () => this.downloadVideo());
        document.getElementById('createNewBtn')?.addEventListener('click', () => this.reset());
        
        // Auth modal
        document.getElementById('googleSignIn')?.addEventListener('click', () => this.signInWithGoogle());
        document.getElementById('emailForm')?.addEventListener('submit', (e) => this.signInWithEmail(e));
        document.getElementById('skipAuth')?.addEventListener('click', () => this.skipAuth());
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeAuthModal());
        document.getElementById('signOutBtn')?.addEventListener('click', () => this.signOut());
        
        // Modal backdrop click to close
        document.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeAuthModal());
    }
    
    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files);
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.handleFiles(files);
    }
    
    handleFiles(files) {
        // Filter PNG files
        const pngFiles = files.filter(file => file.type === 'image/png');
        
        if (pngFiles.length === 0) {
            this.showError('Please select PNG files only');
            return;
        }
        
        this.files = pngFiles.sort((a, b) => a.name.localeCompare(b.name));
        this.displayFiles();
        this.showSettings();
        
        // Log event
        this.logEvent('files_selected', { count: this.files.length });
    }
    
    displayFiles() {
        const fileCount = document.getElementById('fileCount');
        const previewGrid = document.getElementById('previewGrid');
        const filePreview = document.getElementById('filePreview');
        
        fileCount.textContent = this.files.length;
        previewGrid.innerHTML = '';
        
        // Show first few images as preview
        const maxPreviews = 8;
        this.files.slice(0, maxPreviews).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'preview-item';
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Frame ${index + 1}">
                    <span class="preview-label">Frame ${index + 1}</span>
                `;
                previewGrid.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
        
        if (this.files.length > maxPreviews) {
            const more = document.createElement('div');
            more.className = 'preview-item preview-more';
            more.innerHTML = `<span>+${this.files.length - maxPreviews} more</span>`;
            previewGrid.appendChild(more);
        }
        
        filePreview.classList.remove('hidden');
    }
    
    showSettings() {
        document.getElementById('settingsPanel').classList.remove('hidden');
    }
    
    clearFiles() {
        this.files = [];
        document.getElementById('fileInput').value = '';
        document.getElementById('filePreview').classList.add('hidden');
        document.getElementById('settingsPanel').classList.add('hidden');
    }
    
    // Video processing
    async processVideo() {
        if (this.files.length === 0) {
            this.showError('No files selected');
            return;
        }
        
        // Get settings
        const fps = document.getElementById('fps').value;
        const format = document.getElementById('format').value;
        const resolution = document.getElementById('resolution').value;
        const quality = document.getElementById('quality').value;
        
        // Show processing UI
        this.showProcessing();
        
        try {
            // Load FFmpeg if not already loaded
            if (!this.ffmpeg.isLoaded()) {
                this.updateStatus('Loading video processor...');
                await this.ffmpeg.load();
            }
            
            // Write files to FFmpeg filesystem
            this.updateStatus('Preparing images...');
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const data = await this.fetchFile(file);
                await this.ffmpeg.FS('writeFile', `frame_${String(i).padStart(4, '0')}.png`, data);
            }
            
            // Build FFmpeg command
            const outputFile = `output.${format}`;
            const ffmpegArgs = this.buildFFmpegArgs(fps, format, resolution, quality, outputFile);
            
            // Run FFmpeg
            this.updateStatus('Creating video...');
            await this.ffmpeg.run(...ffmpegArgs);
            
            // Read output file
            const data = this.ffmpeg.FS('readFile', outputFile);
            this.videoBlob = new Blob([data.buffer], { type: this.getMimeType(format) });
            
            // Clean up FFmpeg filesystem
            for (let i = 0; i < this.files.length; i++) {
                this.ffmpeg.FS('unlink', `frame_${String(i).padStart(4, '0')}.png`);
            }
            this.ffmpeg.FS('unlink', outputFile);
            
            // Show result
            this.showResult(format);
            
            // Log event
            this.logEvent('video_created', { 
                format, 
                fps, 
                resolution, 
                quality,
                frameCount: this.files.length,
                fileSize: this.videoBlob.size
            });
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showError('Failed to create video. Please try again.');
        }
    }
    
    buildFFmpegArgs(fps, format, resolution, quality, outputFile) {
        const args = [
            '-framerate', fps,
            '-i', 'frame_%04d.png'
        ];
        
        // Resolution scaling
        if (resolution !== 'original') {
            args.push('-vf', `scale=${resolution}:-1`);
        }
        
        // Format-specific encoding
        switch (format) {
            case 'webm':
                args.push('-c:v', 'libvpx-vp9');
                args.push('-pix_fmt', 'yuva420p');
                if (quality === 'high') {
                    args.push('-b:v', '2M');
                } else if (quality === 'medium') {
                    args.push('-b:v', '1M');
                } else {
                    args.push('-b:v', '500k');
                }
                break;
                
            case 'mp4':
                args.push('-c:v', 'libx264');
                args.push('-pix_fmt', 'yuv420p');
                args.push('-preset', quality === 'high' ? 'slow' : quality === 'medium' ? 'medium' : 'fast');
                break;
                
            case 'gif':
                // For GIF, we need a different approach
                // First generate palette, then create GIF
                return this.buildGifArgs(fps, resolution, outputFile);
                
            case 'mov':
                args.push('-c:v', 'prores_ks');
                args.push('-profile:v', '4444');
                args.push('-pix_fmt', 'yuva444p10le');
                break;
        }
        
        args.push(outputFile);
        return args;
    }
    
    buildGifArgs(fps, resolution, outputFile) {
        // For now, simple GIF creation
        // In production, you'd want a two-pass process with palette generation
        const args = [
            '-framerate', fps,
            '-i', 'frame_%04d.png'
        ];
        
        if (resolution !== 'original') {
            args.push('-vf', `fps=${fps},scale=${resolution}:-1:flags=lanczos`);
        } else {
            args.push('-vf', `fps=${fps}`);
        }
        
        args.push(outputFile);
        return args;
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'webm': 'video/webm',
            'mp4': 'video/mp4',
            'gif': 'image/gif',
            'mov': 'video/quicktime'
        };
        return mimeTypes[format] || 'application/octet-stream';
    }
    
    async fetchFile(file) {
        const { fetchFile } = FFmpeg;
        return await fetchFile(file);
    }
    
    onProgress(progress) {
        const percent = Math.round(progress.ratio * 100);
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${percent}%`;
    }
    
    // UI methods
    showProcessing() {
        document.getElementById('settingsPanel').classList.add('hidden');
        document.getElementById('filePreview').classList.add('hidden');
        document.getElementById('processingSection').classList.remove('hidden');
    }
    
    updateStatus(message) {
        document.getElementById('processingStatus').textContent = message;
    }
    
    showResult(format) {
        // Hide processing
        document.getElementById('processingSection').classList.add('hidden');
        
        // Update result info
        document.getElementById('resultFormat').textContent = format.toUpperCase();
        document.getElementById('resultSize').textContent = this.formatFileSize(this.videoBlob.size);
        document.getElementById('resultDuration').textContent = `${this.files.length} frames`;
        
        // Show video preview
        const video = document.getElementById('previewVideo');
        video.src = URL.createObjectURL(this.videoBlob);
        
        // Show result section
        document.getElementById('resultSection').classList.remove('hidden');
    }
    
    showError(message) {
        alert(message); // Simple alert for now, can be replaced with better UI
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    reset() {
        this.files = [];
        this.videoBlob = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('resultSection').classList.add('hidden');
        document.getElementById('dropZone').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Download handling
    async downloadVideo() {
        if (!this.videoBlob) return;
        
        // Check if user is authenticated
        if (!this.currentUser) {
            // Show auth modal
            this.showAuthModal();
            return;
        }
        
        // Proceed with download
        this.performDownload();
    }
    
    performDownload() {
        if (!this.videoBlob) return;
        
        const format = document.getElementById('format').value;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.videoBlob);
        a.download = `transparent_video_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Log download
        this.logEvent('video_downloaded', {
            format,
            fileSize: this.videoBlob.size,
            frameCount: this.files.length
        });
        
        // Track in Supabase
        if (this.supabase && this.currentUser) {
            this.trackDownload();
        }
    }
    
    skipAuth() {
        this.closeAuthModal();
        this.performDownload();
    }
    
    // Auth methods
    showAuthModal() {
        document.getElementById('authModal').classList.remove('hidden');
    }
    
    closeAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    }
    
    async checkAuth() {
        if (!this.supabase) return;
        
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
            this.updateUserUI();
        }
    }
    
    updateUserUI() {
        if (this.currentUser) {
            document.getElementById('userEmail').textContent = this.currentUser.email;
            document.getElementById('userSection').classList.remove('hidden');
        } else {
            document.getElementById('userSection').classList.add('hidden');
        }
    }
    
    async signInWithGoogle() {
        if (!this.supabase) {
            console.error('Supabase not initialized');
            return;
        }
        
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            
        } catch (error) {
            console.error('Google sign in error:', error);
            this.showError('Failed to sign in with Google');
        }
    }
    
    async signInWithEmail(e) {
        e.preventDefault();
        
        if (!this.supabase) {
            console.error('Supabase not initialized');
            return;
        }
        
        const email = document.getElementById('emailInput').value;
        const spinner = document.getElementById('emailSpinner');
        const btnText = document.getElementById('emailBtnText');
        
        // Show loading
        spinner.classList.remove('hidden');
        btnText.textContent = 'Sending...';
        
        try {
            const { data, error } = await this.supabase.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            
            btnText.textContent = 'Check your email!';
            setTimeout(() => {
                this.closeAuthModal();
                this.performDownload();
            }, 2000);
            
        } catch (error) {
            console.error('Email sign in error:', error);
            this.showError('Failed to send login link');
            btnText.textContent = 'Continue with Email';
        } finally {
            spinner.classList.add('hidden');
        }
    }
    
    async signOut() {
        if (!this.supabase) return;
        
        await this.supabase.auth.signOut();
        this.currentUser = null;
        this.updateUserUI();
    }
    
    async trackDownload() {
        if (!this.supabase || !this.currentUser) return;
        
        try {
            const { data, error } = await this.supabase
                .from('downloads')
                .insert({
                    user_id: this.currentUser.id,
                    format: document.getElementById('format').value,
                    frame_count: this.files.length,
                    file_size: this.videoBlob.size
                });
                
            if (error) console.error('Failed to track download:', error);
        } catch (error) {
            console.error('Download tracking error:', error);
        }
    }
    
    // Analytics
    async logEvent(eventName, data = {}) {
        try {
            await fetch('/api/log-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event: eventName,
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }
}

// Initialize app
const app = new TransparentVideoApp();