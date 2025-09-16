/**
 * Unit tests for device detection utilities
 */

import { DeviceDetector, deviceDetector } from '../../src/utils/device';

describe('DeviceDetector', () => {
  beforeEach(() => {
    // Reset navigator.userAgent for each test
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      writable: true
    });

    // Reset screen dimensions
    Object.defineProperty(window.screen, 'width', { value: 1920, writable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, writable: true });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DeviceDetector.getInstance();
      const instance2 = DeviceDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Desktop detection', () => {
    it('should detect desktop device', () => {
      const deviceInfo = deviceDetector.getDeviceInfo();
      expect(deviceInfo.isDesktop).toBe(true);
      expect(deviceInfo.isMobile).toBe(false);
      expect(deviceInfo.isTablet).toBe(false);
    });

    it('should return desktop optimal settings', () => {
      const settings = deviceDetector.getOptimalProcessingSettings();
      expect(settings.maxFrameCount).toBe(1000);
      expect(settings.maxFileSizeMB).toBe(500);
      expect(settings.defaultQuality).toBe('good');
    });
  });

  describe('Mobile detection', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });
      Object.defineProperty(window.screen, 'width', { value: 375, writable: true });
    });

    it('should detect mobile device', () => {
      // Create new instance to pick up changed userAgent
      const detector = new (DeviceDetector as any)();
      const deviceInfo = detector.getDeviceInfo();

      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.isDesktop).toBe(false);
      expect(deviceInfo.isTablet).toBe(false);
    });

    it('should return mobile optimal settings', () => {
      const detector = new (DeviceDetector as any)();
      const settings = detector.getOptimalProcessingSettings();

      expect(settings.maxFrameCount).toBe(100);
      expect(settings.maxFileSizeMB).toBe(50);
      expect(settings.defaultQuality).toBe('realtime');
      expect(settings.recommendedFPS).toBe(15);
    });
  });

  describe('Tablet detection', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true
      });
      Object.defineProperty(window.screen, 'width', { value: 768, writable: true });
    });

    it('should detect tablet device', () => {
      const detector = new (DeviceDetector as any)();
      const deviceInfo = detector.getDeviceInfo();

      expect(deviceInfo.isTablet).toBe(true);
      expect(deviceInfo.isMobile).toBe(false);
      expect(deviceInfo.isDesktop).toBe(false);
    });
  });

  describe('Feature detection', () => {
    it('should detect File API support', () => {
      expect(deviceDetector.supportsFileAPI()).toBe(true);
    });

    it('should detect WebWorker support', () => {
      expect(deviceDetector.supportsWebWorkers()).toBe(true);
    });

    it('should detect SharedArrayBuffer support', () => {
      expect(deviceDetector.supportsSharedArrayBuffer()).toBe(true);
    });
  });

  describe('Memory estimation', () => {
    it('should estimate memory for desktop', () => {
      const memory = deviceDetector.getMemoryEstimate();
      expect(memory).toBeGreaterThan(1000); // Should be generous for desktop
    });

    it('should estimate memory when performance.memory is available', () => {
      const memory = deviceDetector.getMemoryEstimate();
      expect(typeof memory).toBe('number');
      expect(memory).toBeGreaterThan(0);
    });
  });

  describe('Codec recommendations', () => {
    it('should recommend appropriate codec', () => {
      const codec = deviceDetector.getRecommendedCodec();
      expect(['vp9', 'vp8', 'gif']).toContain(codec);
    });
  });

  describe('Worker recommendations', () => {
    it('should recommend workers for desktop', () => {
      expect(deviceDetector.shouldUseWorkers()).toBe(true);
    });

    it('should not recommend workers for mobile', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      });
      Object.defineProperty(window.screen, 'width', { value: 375, writable: true });

      const detector = new (DeviceDetector as any)();
      expect(detector.shouldUseWorkers()).toBe(false);
    });
  });
});

describe('Device utility functions', () => {
  it('should export utility functions', () => {
    expect(typeof deviceDetector.isMobile).toBe('function');
    expect(typeof deviceDetector.isTablet).toBe('function');
    expect(typeof deviceDetector.isDesktop).toBe('function');
  });
});

describe('CSS breakpoints', () => {
  it('should have valid breakpoint definitions', () => {
    const { breakpoints } = require('../../src/utils/device');

    expect(breakpoints.mobile).toBe('(max-width: 768px)');
    expect(breakpoints.tablet).toBe('(min-width: 769px) and (max-width: 1024px)');
    expect(breakpoints.desktop).toBe('(min-width: 1025px)');
    expect(breakpoints.touch).toBe('(pointer: coarse)');
    expect(breakpoints.mouse).toBe('(pointer: fine)');
  });
});