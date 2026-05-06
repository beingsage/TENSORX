// Comprehensive error handling and logging system

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AppError {
  id: string;
  code: string;
  message: string;
  details?: Record<string, any>;
  severity: ErrorSeverity;
  timestamp: Date;
  stack?: string;
  userId?: string;
  endpoint?: string;
}

export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 1000;

  static createError(
    code: string,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: Record<string, any>
  ): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      code,
      message,
      severity,
      timestamp: new Date(),
      details,
    };

    this.log(error);
    return error;
  }

  static log(error: AppError, endpoint?: string): void {
    error.endpoint = endpoint;
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console output for development
    const prefix = `[${error.severity.toUpperCase()}]`;
    console.log(prefix, error.code, error.message, error.details);
  }

  static getErrors(filter?: { severity?: ErrorSeverity; code?: string }): AppError[] {
    return this.errorLog.filter(e => {
      if (filter?.severity && e.severity !== filter.severity) return false;
      if (filter?.code && e.code !== filter.code) return false;
      return true;
    });
  }

  static clearErrors(): void {
    this.errorLog = [];
  }

  private static generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static getUserFriendlyMessage(code: string): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again',
      NOT_FOUND: 'The requested item was not found',
      UNAUTHORIZED: 'You do not have permission to access this',
      SERVER_ERROR: 'Something went wrong. Please try again later',
      TIMEOUT: 'The request took too long. Please try again',
      NETWORK_ERROR: 'Network error. Please check your connection',
      DUPLICATE_PROPERTY: 'This property already exists in the system',
      INVALID_COORDINATES: 'Invalid latitude/longitude provided',
      DATABASE_ERROR: 'Database operation failed',
      MODEL_ERROR: 'Valuation model error. Please try again',
      INSUFFICIENT_DATA: 'Not enough data to process valuation',
    };

    return messages[code] || 'An unknown error occurred';
  }
}

// Specific error constructors
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public resource?: string, public id?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class DuplicateError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'DuplicateError';
  }
}

export class ModelError extends Error {
  constructor(message: string, public modelName?: string) {
    super(message);
    this.name = 'ModelError';
  }
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId?: string;
}

export function successResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  requestId?: string
): ApiResponse {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// Try-catch wrapper for async functions
export function asyncHandler(fn: Function) {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.log(
        ErrorHandler.createError(
          'UNHANDLED_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
          ErrorSeverity.ERROR,
          { stack: error instanceof Error ? error.stack : undefined }
        )
      );
      throw error;
    }
  };
}
