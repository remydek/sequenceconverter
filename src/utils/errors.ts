/**
 * Custom error classes for the application
 */

export class AppError extends Error {
    public readonly code: string;
    public readonly details?: any;
    public readonly timestamp: Date;

    constructor(options: {
        code: string;
        message: string;
        details?: any;
        timestamp?: Date;
    }) {
        super(options.message);
        this.name = 'AppError';
        this.code = options.code;
        this.details = options.details;
        this.timestamp = options.timestamp || new Date();

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack
        };
    }
}

export class FFmpegError extends AppError {
    constructor(message: string, details?: any) {
        super({
            code: 'FFMPEG_ERROR',
            message,
            details
        });
        this.name = 'FFmpegError';
    }
}

export class AuthError extends AppError {
    constructor(message: string, details?: any) {
        super({
            code: 'AUTH_ERROR',
            message,
            details
        });
        this.name = 'AuthError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super({
            code: 'VALIDATION_ERROR',
            message,
            details
        });
        this.name = 'ValidationError';
    }
}