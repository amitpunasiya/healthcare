import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidateOptions {
  isAuthRoute?: boolean;
  genericMessage?: string;
}

/**
 * Sanitizes input payload for security audit logs.
 * Masks passwords, keys, and tokens to prevent credential exposure in log files,
 * while preserving field names and submitted text (e.g. script injection payloads)
 * so security administrators can analyze attack attempts.
 */
export const sanitizePayloadForLogging = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizePayloadForLogging);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('authorization')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayloadForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const validateRequest = (schema: ZodSchema, options: ValidateOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed && typeof parsed === 'object') {
        if ('body' in parsed && parsed.body !== undefined) req.body = parsed.body;
        if ('query' in parsed && parsed.query !== undefined) req.query = parsed.query;
        if ('params' in parsed && parsed.params !== undefined) req.params = parsed.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorList = error.errors.map((e) => {
          const field = e.path.filter((p) => p !== 'body' && p !== 'query' && p !== 'params').join('.');
          return {
            field: field || 'input',
            message: e.message,
            code: e.code,
          };
        });

        // If it's an authentication route (login/register/reset), log the rejection server-side for threat monitoring
        // and return a GENERIC error message without leaking which specific field failed
        if (options.isAuthRoute) {
          console.warn('[SECURITY AUTH REJECTION ATTEMPT]:', {
            timestamp: new Date().toISOString(),
            ip: req.ip || req.socket.remoteAddress,
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent') || 'unknown',
            violations: errorList.map((e) => `${e.field}: ${e.message}`),
            submittedPayload: sanitizePayloadForLogging(req.body),
          });

          const defaultGenericMessage = req.originalUrl.includes('/login')
            ? 'Invalid email, password, or request data.'
            : 'Invalid authentication or registration request data.';

          return res.status(400).json({
            success: false,
            message: options.genericMessage || defaultGenericMessage,
          });
        }

        // Standard non-auth validation error response
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errorList.length === 1 ? errorList[0].message : 'Input validation failed. Please check your data format.',
          errors: errorList,
        });
      }
      next(error);
    }
  };
};
