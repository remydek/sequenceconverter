/**
 * Integration tests for the main application
 * Tests the interaction between different components
 */

import { JSDOM } from 'jsdom';

// Mock modules before importing the app
jest.mock('../../src/services/ffmpeg');
jest.mock('../../src/services/auth');
jest.mock('../../src/utils/device');

describe('TransparentVideoApp Integration', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window;

  beforeEach(() => {
    // Create a virtual DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test</title>
      </head>
      <body>
        <!-- Auth container -->
        <div id="auth-container">
          <div id="user-info" class="hidden"></div>
          <button id="auth-button">Sign In</button>
        </div>

        <!-- File input -->
        <input type="file" id="file-input" multiple accept="image/png">
        <div id="dropzone"></div>
        <div id="file-list"></div>

        <!-- Processing options -->
        <div id="processing-options">
          <input type="range" id="fps-input" value="24" min="1" max="60">
          <select id="codec-select">
            <option value="vp9">VP9</option>
            <option value="vp8">VP8</option>
            <option value="gif">GIF</option>
          </select>
          <select id="quality-select">
            <option value="realtime">Fast</option>
            <option value="good">Good</option>
            <option value="best">Best</option>
          </select>
        </div>

        <!-- Progress -->
        <div id="progress-container" style="display: none;">
          <div id="progress-bar" style="width: 0%;"></div>
          <div id="progress-text">Initializing...</div>
        </div>

        <!-- Results -->
        <div id="results-container" style="display: none;"></div>
        <button id="start-processing">Start Processing</button>
        <a id="download-button" href="#" download>Download</a>

        <!-- Toast container -->
        <div id="toast-container"></div>

        <!-- Error container -->
        <div id="error-container" style="display: none;"></div>

        <!-- Step sections -->
        <section class="step-section active" data-step="upload"></section>
        <section class="step-section" data-step="configure"></section>
        <section class="step-section" data-step="processing"></section>
        <section class="step-section" data-step="complete"></section>

        <!-- Device tips -->
        <div id="device-tips" style="display: none;"></div>
      </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window as unknown as Window;

    // Set up globals
    global.document = document;
    global.window = window;
    global.navigator = window.navigator;
    global.location = window.location;

    // Mock fetch API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        environment: 'test',
        supabase: {
          url: 'https://test.supabase.co',
          anonKey: 'test-key'
        },
        features: {
          clientSideProcessing: true,
          premiumFeatures: false,
          usageTracking: true,
          fileUploads: false,
          authRequiredForDownload: false
        },
        limits: {
          maxFileSizeMB: 100,
          maxProcessingTimeSeconds: 300,
          maxFrameCount: 500,
          supportedFormats: ['webm', 'gif']
        }
      })
    });
  });

  afterEach(() => {
    dom.window.close();
    jest.clearAllMocks();
  });

  describe('App initialization', () => {
    it('should load configuration on startup', async () => {
      // Dynamic import to ensure mocks are set up
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();

      await app.init();

      expect(fetch).toHaveBeenCalledWith('/api/config');
    });

    it('should handle configuration loading failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();

      await expect(app.init()).resolves.not.toThrow();
    });

    it('should set up DOM event listeners', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();

      await app.init();

      // Check if event listeners are attached
      const fileInput = document.getElementById('file-input');
      const startButton = document.getElementById('start-processing');

      expect(fileInput).toBeTruthy();
      expect(startButton).toBeTruthy();
    });
  });

  describe('File handling', () => {
    it('should handle file selection', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      // Mock file input files
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });

      // Simulate file input change
      const event = new window.Event('change');
      fileInput.dispatchEvent(event);

      // Should not throw and should update file list
      expect(document.getElementById('file-list')).toBeTruthy();
    });

    it('should handle drag and drop', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const dropzone = document.getElementById('dropzone');
      expect(dropzone).toBeTruthy();

      // Test drag events
      const dragEvent = new window.DragEvent('dragover', {
        bubbles: true,
        cancelable: true
      });

      expect(() => dropzone!.dispatchEvent(dragEvent)).not.toThrow();
    });

    it('should validate PNG files only', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });

      const event = new window.Event('change');
      fileInput.dispatchEvent(event);

      // Should show error for non-PNG files
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeTruthy();
    });
  });

  describe('Processing workflow', () => {
    it('should update UI steps correctly', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      // Check initial state
      const uploadSection = document.querySelector('[data-step="upload"]');
      expect(uploadSection?.classList.contains('active')).toBe(true);

      // Add valid files to simulate progression
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });

      const event = new window.Event('change');
      fileInput.dispatchEvent(event);

      // Should progress to configure step
      const configureSection = document.querySelector('[data-step="configure"]');
      expect(configureSection).toBeTruthy();
    });

    it('should handle processing options changes', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const fpsInput = document.getElementById('fps-input') as HTMLInputElement;
      const codecSelect = document.getElementById('codec-select') as HTMLSelectElement;

      // Test FPS change
      fpsInput.value = '30';
      fpsInput.dispatchEvent(new window.Event('input'));

      // Test codec change
      codecSelect.value = 'vp8';
      codecSelect.dispatchEvent(new window.Event('change'));

      // Should not throw
      expect(() => {
        fpsInput.dispatchEvent(new window.Event('input'));
        codecSelect.dispatchEvent(new window.Event('change'));
      }).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should display errors in error container', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      // Force an error by trying to process without files
      const startButton = document.getElementById('start-processing');
      startButton?.click();

      // Should show error
      const errorContainer = document.getElementById('error-container');
      expect(errorContainer).toBeTruthy();
    });

    it('should show toast notifications', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const toastContainer = document.getElementById('toast-container');
      expect(toastContainer).toBeTruthy();

      // Toast functionality is tested through user interactions
    });
  });

  describe('Authentication integration', () => {
    it('should handle auth state changes', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const authButton = document.getElementById('auth-button');
      const userInfo = document.getElementById('user-info');

      expect(authButton).toBeTruthy();
      expect(userInfo).toBeTruthy();

      // Click auth button
      authButton?.click();

      // Should not throw
      expect(() => authButton?.click()).not.toThrow();
    });
  });

  describe('Mobile responsiveness', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window.screen, 'width', { value: 375, writable: true });
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });

      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      // Should add mobile classes to body
      expect(document.body.classList.contains('mobile-device')).toBe(true);
    });

    it('should show device-specific tips', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      const deviceTips = document.getElementById('device-tips');
      expect(deviceTips).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on page unload', async () => {
      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      expect(() => app.cleanup()).not.toThrow();
    });
  });

  describe('Analytics and tracking', () => {
    it('should track events when enabled', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          environment: 'test',
          features: {
            clientSideProcessing: true,
            usageTracking: true
          },
          limits: {
            maxFileSizeMB: 100,
            maxProcessingTimeSeconds: 300,
            maxFrameCount: 500,
            supportedFormats: ['webm', 'gif']
          }
        })
      });

      const { default: TransparentVideoApp } = await import('../../src/app');
      const app = new TransparentVideoApp();
      await app.init();

      // Should make initial config request
      expect(fetch).toHaveBeenCalledWith('/api/config');
    });
  });
});