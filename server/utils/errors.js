/**
 * Base error class for API errors
 */
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for bad requests (400)
 */
class BadRequestError extends APIError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Error for unauthorized requests (401)
 */
class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Error for forbidden requests (403)
 */
class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Error for not found resources (404)
 */
class NotFoundError extends APIError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

/**
 * Error for validation failures (422)
 */
class ValidationError extends APIError {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/**
 * Error for server errors (500)
 */
class ServerError extends APIError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

/**
 * Error for database errors (503)
 */
class DatabaseError extends APIError {
  constructor(message = 'Database Error') {
    super(message, 503);
  }
}

module.exports = {
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ServerError,
  DatabaseError
}; 