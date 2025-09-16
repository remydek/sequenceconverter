/**
 * Device detection and mobile optimization utilities
 */

import { DeviceInfo } from '../types';

export class DeviceDetector {
    private static instance: DeviceDetector;
    private deviceInfo: DeviceInfo;

    private constructor() {
        this.deviceInfo = this.detectDevice();
    }

    public static getInstance(): DeviceDetector {
        if (!DeviceDetector.instance) {
            DeviceDetector.instance = new DeviceDetector();
        }
        return DeviceDetector.instance;
    }

    private detectDevice(): DeviceInfo {
        const userAgent = navigator.userAgent;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;

        // Mobile detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                         screenWidth <= 768;

        // Tablet detection (more nuanced)
        const isTablet = (/iPad/i.test(userAgent)) ||
                        (!/Android.*Mobile/i.test(userAgent) && /Android/i.test(userAgent)) ||
                        (screenWidth > 768 && screenWidth <= 1024 && 'ontouchstart' in window);

        const isDesktop = !isMobile && !isTablet;

        return {
            isMobile,
            isTablet,
            isDesktop,
            userAgent,
            screenWidth,
            screenHeight,
        };
    }

    public getDeviceInfo(): DeviceInfo {
        return { ...this.deviceInfo };
    }

    public isMobile(): boolean {
        return this.deviceInfo.isMobile;
    }

    public isTablet(): boolean {
        return this.deviceInfo.isTablet;
    }

    public isDesktop(): boolean {
        return this.deviceInfo.isDesktop;
    }

    public isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    public supportsFileAPI(): boolean {
        return !!(window.File && window.FileReader && window.FileList && window.Blob);
    }

    public supportsWebWorkers(): boolean {
        return typeof Worker !== 'undefined';
    }

    public supportsSharedArrayBuffer(): boolean {
        return typeof SharedArrayBuffer !== 'undefined';
    }

    public getOptimalProcessingSettings() {
        const { isMobile, isTablet } = this.deviceInfo;

        // Conservative settings for mobile devices
        if (isMobile) {
            return {
                maxFrameCount: 100,
                maxFileSizeMB: 50,
                defaultQuality: 'realtime' as const,
                recommendedFPS: 15,
                maxResolution: { width: 640, height: 640 }
            };
        }

        // Medium settings for tablets
        if (isTablet) {
            return {
                maxFrameCount: 500,
                maxFileSizeMB: 200,
                defaultQuality: 'good' as const,
                recommendedFPS: 24,
                maxResolution: { width: 1280, height: 1280 }
            };
        }

        // Full settings for desktop
        return {
            maxFrameCount: 1000,
            maxFileSizeMB: 500,
            defaultQuality: 'good' as const,
            recommendedFPS: 30,
            maxResolution: { width: 1920, height: 1920 }
        };
    }

    public getMemoryEstimate(): number {
        // Rough estimate of available memory in MB
        if ('memory' in performance) {
            return (performance as any).memory.jsHeapSizeLimit / (1024 * 1024);
        }

        // Fallback estimates based on device type
        if (this.isMobile()) return 512; // Conservative for mobile
        if (this.isTablet()) return 1024; // Medium for tablet
        return 2048; // Generous for desktop
    }

    public shouldUseWorkers(): boolean {
        return this.supportsWebWorkers() && !this.isMobile();
    }

    public getRecommendedCodec(): string {
        // VP9 is well supported on modern devices
        if (this.supportsCodec('video/webm; codecs="vp9"')) {
            return 'vp9';
        }

        // Fallback to VP8 for wider compatibility
        if (this.supportsCodec('video/webm; codecs="vp8"')) {
            return 'vp8';
        }

        // Last resort: GIF (always supported)
        return 'gif';
    }

    private supportsCodec(mimeType: string): boolean {
        const video = document.createElement('video');
        return video.canPlayType(mimeType) !== '';
    }
}

// Singleton instance
export const deviceDetector = DeviceDetector.getInstance();

// Utility functions
export function isMobileDevice(): boolean {
    return deviceDetector.isMobile();
}

export function isTabletDevice(): boolean {
    return deviceDetector.isTablet();
}

export function isDesktopDevice(): boolean {
    return deviceDetector.isDesktop();
}

export function getOptimalSettings() {
    return deviceDetector.getOptimalProcessingSettings();
}

export function addResponsiveClasses(): void {
    const deviceInfo = deviceDetector.getDeviceInfo();
    const body = document.body;

    // Add device type classes
    if (deviceInfo.isMobile) {
        body.classList.add('mobile-device');
    }
    if (deviceInfo.isTablet) {
        body.classList.add('tablet-device');
    }
    if (deviceInfo.isDesktop) {
        body.classList.add('desktop-device');
    }

    // Add touch support class
    if (deviceDetector.isTouchDevice()) {
        body.classList.add('touch-device');
    }

    // Add screen size classes
    if (deviceInfo.screenWidth <= 640) {
        body.classList.add('screen-sm');
    } else if (deviceInfo.screenWidth <= 1024) {
        body.classList.add('screen-md');
    } else {
        body.classList.add('screen-lg');
    }
}

// CSS media query helpers
export const breakpoints = {
    mobile: '(max-width: 768px)',
    tablet: '(min-width: 769px) and (max-width: 1024px)',
    desktop: '(min-width: 1025px)',
    touch: '(pointer: coarse)',
    mouse: '(pointer: fine)',
    landscape: '(orientation: landscape)',
    portrait: '(orientation: portrait)',
    highDPI: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
} as const;

export function matchesMediaQuery(query: string): boolean {
    return window.matchMedia(query).matches;
}