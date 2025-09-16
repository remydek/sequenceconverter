// Global state
let selectedFiles = [];
let currentJobId = null;

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const settings = document.getElementById('settings');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
const error = document.getElementById('error');
const errorText = document.getElementById('errorText');

// Buttons
const clearFilesBtn = document.getElementById('clearFiles');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newVideoBtn = document.getElementById('newVideoBtn');
const retryBtn = document.getElementById('retryBtn');

// Event listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
clearFilesBtn.addEventListener('click', clearFiles);
processBtn.addEventListener('click', processVideo);
downloadBtn.addEventListener('click', downloadVideo);
newVideoBtn.addEventListener('click', resetUI);
retryBtn.addEventListener('click', resetUI);

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleFiles(files) {
    // Filter PNG files
    const pngFiles = files.filter(file => file.type === 'image/png');
    
    if (pngFiles.length === 0) {
        showError('Please select PNG files only');
        return;
    }
    
    selectedFiles = pngFiles;
    displayFiles();
    showSettings();
}

function displayFiles() {
    fileItems.innerHTML = '';
    
    // Sort files by name
    const sortedFiles = [...selectedFiles].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = `${index + 1}. ${file.name} (${formatFileSize(file.size)})`;
        fileItems.appendChild(item);
    });
    
    fileList.classList.remove('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showSettings() {
    settings.classList.remove('hidden');
}

function clearFiles() {
    selectedFiles = [];
    fileInput.value = '';
    fileList.classList.add('hidden');
    settings.classList.add('hidden');
    fileItems.innerHTML = '';
}

async function processVideo() {
    if (selectedFiles.length === 0) {
        showError('No files selected');
        return;
    }
    
    // Disable button
    processBtn.disabled = true;
    processBtn.querySelector('.btn-text').textContent = 'Processing...';
    processBtn.querySelector('.spinner').classList.remove('hidden');
    
    // Show progress
    progress.classList.remove('hidden');
    settings.classList.add('hidden');
    fileList.classList.add('hidden');
    
    try {
        // Upload files
        progressText.textContent = 'Uploading images...';
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        const uploadResponse = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Upload failed');
        }
        
        const uploadData = await uploadResponse.json();
        currentJobId = uploadData.job_id;
        
        // Start processing
        progressText.textContent = 'Creating video...';
        const processResponse = await fetch(`/process/${currentJobId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fps: parseInt(document.getElementById('fps').value),
                codec: document.getElementById('codec').value,
                quality: document.getElementById('quality').value
            })
        });
        
        if (!processResponse.ok) {
            throw new Error('Processing failed');
        }
        
        // Monitor progress
        monitorProgress();
        
    } catch (err) {
        showError(err.message || 'An error occurred');
        resetProcessButton();
    }
}

async function monitorProgress() {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${currentJobId}`);
            const data = await response.json();
            
            if (data.status === 'processing') {
                progressFill.style.width = `${data.progress}%`;
                progressText.textContent = `Processing... ${data.progress}%`;
            } else if (data.status === 'completed') {
                clearInterval(checkInterval);
                progressFill.style.width = '100%';
                progressText.textContent = 'Complete!';
                showResult(data.output_size);
            } else if (data.status === 'failed') {
                clearInterval(checkInterval);
                showError(data.error || 'Processing failed');
            }
        } catch (err) {
            clearInterval(checkInterval);
            showError('Failed to check status');
        }
    }, 1000);
}

function showResult(fileSize) {
    progress.classList.add('hidden');
    result.classList.remove('hidden');
    resultText.textContent = `Your transparent video is ready! (${formatFileSize(fileSize)})`;
    resetProcessButton();
}

function showError(message) {
    progress.classList.add('hidden');
    result.classList.add('hidden');
    error.classList.remove('hidden');
    errorText.textContent = message;
    resetProcessButton();
}

function resetProcessButton() {
    processBtn.disabled = false;
    processBtn.querySelector('.btn-text').textContent = 'Create Video';
    processBtn.querySelector('.spinner').classList.add('hidden');
}

function downloadVideo() {
    if (currentJobId) {
        window.location.href = `/download/${currentJobId}`;
    }
}

function resetUI() {
    // Hide all sections
    progress.classList.add('hidden');
    result.classList.add('hidden');
    error.classList.add('hidden');
    
    // Reset progress
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading images...';
    
    // Clear files
    clearFiles();
    
    // Reset job ID
    currentJobId = null;
}
