export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class MetaAPIError extends AppError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'META_API_ERROR');
  }
}

export class OCRProviderError extends AppError {
  constructor(message: string, provider: string) {
    super(`OCR Error (${provider}): ${message}`, 500, 'OCR_PROVIDER_ERROR');
  }
}

export class OpenAIError extends AppError {
  constructor(message: string) {
    super(message, 500, 'OPENAI_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class IdempotencyError extends AppError {
  constructor(message: string = 'Event already processed') {
    super(message, 200, 'IDEMPOTENCY_ERROR');
  }
}
