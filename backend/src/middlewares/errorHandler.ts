import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Global centralized error handling middleware.
 * Prevents information leakage by sanitizing all errors sent to users,
 * ensuring users NEVER receive stack traces, internal file paths, or raw database messages,
 * while maintaining detailed server-side error logging for debugging.
 */
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  // 1. Comprehensive server-side logging for diagnostics
  console.error('[SERVER ERROR DETAIL]:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as any).user?.id || 'anonymous',
    name: err?.name,
    message: err?.message,
    code: err?.code,
    stack: err?.stack,
  });

  // 2. Default sanitized response
  let statusCode = 500;
  let userMessage = 'An unexpected error occurred while processing your request. Please try again later.';

  // 3. Categorize and sanitize error types
  if (err instanceof AppError || err?.isOperational) {
    // Explicit, safe operational errors
    statusCode = err.statusCode || 400;
    userMessage = err.message;
  } else if (err?.name === 'CastError') {
    // Mongoose ObjectId cast error (e.g. invalid hex ID parameter)
    statusCode = 400;
    userMessage = 'Invalid resource identifier format.';
  } else if (err?.code === 11000) {
    // MongoDB duplicate key collision
    statusCode = 409;
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : null;
    userMessage = field
      ? `A record with this ${field} already exists.`
      : 'A record with this information already exists.';
  } else if (err?.name === 'ValidationError') {
    // Mongoose schema validation failure
    statusCode = 400;
    userMessage = 'Invalid input data. Please verify your submission.';
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError' || err?.name === 'NotBeforeError') {
    // JWT verification failures
    statusCode = 401;
    userMessage = 'Authentication session invalid or expired. Please sign in again.';
  } else if (err?.type === 'entity.parse.failed') {
    // Malformed JSON body
    statusCode = 400;
    userMessage = 'Malformed JSON payload in request.';
  } else if (err?.name === 'MulterError') {
    // Multer file upload errors
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      userMessage = 'The uploaded file exceeds the maximum permitted size limit.';
    } else {
      userMessage = 'File upload failed. Please verify file specifications.';
    }
  } else if (typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
    statusCode = err.statusCode;
    // Check that message does not contain internal file paths or stack traces
    const rawMsg = String(err.message || '');
    const containsSensitivePath = rawMsg.includes('\\') || rawMsg.includes('/') || rawMsg.includes('at ') || rawMsg.includes('node_modules');
    userMessage = containsSensitivePath ? 'Invalid request parameters.' : rawMsg;
  }

  // 4. Return clean, sanitized JSON response with no stack traces or internal details
  return res.status(statusCode).json({
    success: false,
    message: userMessage,
  });
};
