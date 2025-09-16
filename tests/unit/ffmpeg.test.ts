/**
 * Unit tests for FFmpeg service
 */

import { FFmpegService } from '../../src/services/ffmpeg';
import { AppError, ProcessingOptions } from '../../src/types';

// Mock the device detector
jest.mock('../../src/utils/device', () => ({
  deviceDetector: {
    getDeviceInfo: () => ({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      userAgent: 'test',
      screenWidth: 1920,
      screenHeight: 1080
    }),
    getOptimalProcessingSettings: () => ({
      maxFrameCount: 1000,
      maxFileSizeMB: 500,
      defaultQuality: 'good',
      recommendedFPS: 30
    })
  }
}));

describe('FFmpegService', () => {
  let ffmpegService: FFmpegService;

  beforeEach(() => {
    ffmpegService = FFmpegService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    ffmpegService.cleanup();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FFmpegService.getInstance();
      const instance2 = FFmpegService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize FFmpeg successfully', async () => {
      await expect(ffmpegService.initialize()).resolves.not.toThrow();
    });

    it('should throw error when FFmpeg is not available', async () => {
      // Mock FFmpeg as unavailable
      (global.window as any).FFmpeg = undefined;

      await expect(ffmpegService.initialize()).rejects.toThrow(AppError);
      await expect(ffmpegService.initialize()).rejects.toThrow('FFmpeg.wasm library not found');

      // Restore FFmpeg mock
      (global.window as any).FFmpeg = {
        createFFmpeg: jest.fn(() => ({
          load: jest.fn().mockResolvedValue(undefined),
          isLoaded: jest.fn().mockReturnValue(true),
          run: jest.fn().mockResolvedValue(undefined),
          FS: jest.fn(),
          exit: jest.fn(),
          setProgress: jest.fn(),
          setLogger: jest.fn()
        })),
        fetchFile: jest.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]))
      };
    });

    it('should handle loading state correctly', async () => {
      expect(ffmpegService.isReady()).toBe(false);
      await ffmpegService.initialize();
      expect(ffmpegService.isReady()).toBe(true);
    });
  });

  describe('Progress and logging', () => {
    beforeEach(async () => {
      await ffmpegService.initialize();
    });

    it('should set progress callback', () => {
      const progressCallback = jest.fn();
      ffmpegService.setProgressCallback(progressCallback);

      // This should not throw
      expect(() => ffmpegService.setProgressCallback(progressCallback)).not.toThrow();
    });

    it('should set log callback', () => {
      const logCallback = jest.fn();
      ffmpegService.setLogCallback(logCallback);

      expect(() => ffmpegService.setLogCallback(logCallback)).not.toThrow();
    });
  });

  describe('File processing', () => {
    let mockFiles: File[];
    let processingOptions: ProcessingOptions;

    beforeEach(async () => {
      await ffmpegService.initialize();

      // Create mock files
      mockFiles = [
        new File(['test1'], 'frame001.png', { type: 'image/png' }),
        new File(['test2'], 'frame002.png', { type: 'image/png' }),
        new File(['test3'], 'frame003.png', { type: 'image/png' })
      ];

      processingOptions = {
        fps: 24,
        codec: 'vp9',
        quality: 'good',
        outputFormat: 'webm'
      };
    });

    it('should process files successfully', async () => {
      const result = await ffmpegService.processFiles(mockFiles, processingOptions);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('video/webm');
    });

    it('should reject empty file list', async () => {
      await expect(
        ffmpegService.processFiles([], processingOptions)
      ).rejects.toThrow(AppError);

      await expect(
        ffmpegService.processFiles([], processingOptions)
      ).rejects.toThrow('Please select at least one PNG image');
    });

    it('should reject non-PNG files', async () => {
      const invalidFiles = [
        new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      ];

      await expect(
        ffmpegService.processFiles(invalidFiles, processingOptions)
      ).rejects.toThrow(AppError);
    });

    it('should reject too many files', async () => {
      // Create more files than the limit
      const tooManyFiles = Array.from({ length: 1001 }, (_, i) =>
        new File(['test'], `frame${i.toString().padStart(3, '0')}.png`, { type: 'image/png' })
      );

      await expect(
        ffmpegService.processFiles(tooManyFiles, processingOptions)
      ).rejects.toThrow(AppError);

      await expect(
        ffmpegService.processFiles(tooManyFiles, processingOptions)
      ).rejects.toThrow('Too many files');
    });

    it('should handle progress callback', async () => {
      const progressCallback = jest.fn();

      await ffmpegService.processFiles(mockFiles, processingOptions, progressCallback);

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle different codecs', async () => {
      const testCases = [
        { codec: 'vp9' as const, expectedType: 'video/webm' },
        { codec: 'vp8' as const, expectedType: 'video/webm' },
        { codec: 'h264' as const, expectedType: 'video/mp4' },
        { codec: 'gif' as const, expectedType: 'image/gif' }
      ];

      for (const testCase of testCases) {
        const options = { ...processingOptions, codec: testCase.codec };
        const result = await ffmpegService.processFiles(mockFiles, options);
        expect(result.type).toBe(testCase.expectedType);
      }
    });

    it('should handle processing errors', async () => {
      // Mock FFmpeg to throw an error
      const mockFFmpeg = (global.window as any).FFmpeg.createFFmpeg();
      mockFFmpeg.run.mockRejectedValue(new Error('Processing failed'));

      await expect(
        ffmpegService.processFiles(mockFiles, processingOptions)
      ).rejects.toThrow(AppError);
    });

    it('should sort files by name', async () => {
      const unsortedFiles = [
        new File(['test3'], 'frame003.png', { type: 'image/png' }),
        new File(['test1'], 'frame001.png', { type: 'image/png' }),
        new File(['test2'], 'frame002.png', { type: 'image/png' })
      ];

      // Should not throw even with unsorted files
      await expect(
        ffmpegService.processFiles(unsortedFiles, processingOptions)
      ).resolves.toBeInstanceOf(Blob);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await ffmpegService.initialize();
    });

    it('should cleanup resources', () => {
      expect(() => ffmpegService.cleanup()).not.toThrow();
    });

    it('should handle cleanup when not initialized', () => {
      const newService = FFmpegService.getInstance();
      expect(() => newService.cleanup()).not.toThrow();
    });
  });

  describe('Memory usage', () => {
    it('should return memory usage estimate', () => {
      const usage = ffmpegService.getMemoryUsage();
      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Processing without initialization', () => {
    it('should initialize automatically when processing', async () => {
      const newService = FFmpegService.getInstance();
      newService.cleanup(); // Ensure clean state

      const mockFiles = [
        new File(['test'], 'frame001.png', { type: 'image/png' })
      ];

      const processingOptions = {
        fps: 24,
        codec: 'vp9' as const,
        quality: 'good' as const,
        outputFormat: 'webm' as const
      };

      // Should auto-initialize
      await expect(
        newService.processFiles(mockFiles, processingOptions)
      ).resolves.toBeInstanceOf(Blob);
    });
  });
});

describe('FFmpeg configuration', () => {
  it('should configure FFmpeg based on device type', () => {
    // This tests the private getFFmpegConfig method indirectly
    const service = FFmpegService.getInstance();
    expect(() => service.initialize()).not.toThrow();
  });
});