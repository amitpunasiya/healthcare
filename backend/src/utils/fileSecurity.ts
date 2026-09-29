import fs from 'fs';

export interface MagicByteValidationResult {
  isValid: boolean;
  detectedMimeType?: string;
  error?: string;
}

// Dangerous executable tokens to scan for inside uploaded binary payloads
const DANGEROUS_PAYLOAD_PATTERNS = [
  /<\?php/i,
  /<\?=/i,
  /<script[\s>]/i,
  /<\/script>/i,
  /<html[\s>]/i,
  /<!doctype\s+html/i,
  /<svg[\s>]/i,
  /\bonerror\s*=/i,
  /\bonload\s*=/i,
  /\beval\s*\(/i,
  /\bbase64_decode\s*\(/i,
  /\bpassthru\s*\(/i,
  /\bsystem\s*\(/i,
  /\bshell_exec\s*\(/i,
];

/**
 * Validates the true binary content of an uploaded file:
 * 1. Inspects binary magic bytes (file signature) to ensure true format matches PDF, JPEG, or PNG.
 * 2. Scans initial content buffer for polyglot script payloads (e.g. PHP/JS embedded in image headers).
 */
export const validateFileMagicBytes = (filePath: string): MagicByteValidationResult => {
  if (!fs.existsSync(filePath)) {
    return { isValid: false, error: 'File not found on disk for content verification' };
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { isValid: false, error: 'Uploaded file is empty (0 bytes).' };
  }

  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');

    // 1. Read first 16 bytes for magic signature inspection
    const headerBuffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, headerBuffer, 0, 16, 0);

    if (bytesRead < 4) {
      fs.closeSync(fd);
      fd = null;
      return { isValid: false, error: 'Uploaded file is truncated or corrupted.' };
    }

    let detectedMimeType: string | undefined;

    // Check PDF Signature: %PDF (25 50 44 46)
    if (
      headerBuffer[0] === 0x25 &&
      headerBuffer[1] === 0x50 &&
      headerBuffer[2] === 0x44 &&
      headerBuffer[3] === 0x46
    ) {
      detectedMimeType = 'application/pdf';
    }
    // Check JPEG Signature: FF D8 FF
    else if (
      headerBuffer[0] === 0xff &&
      headerBuffer[1] === 0xd8 &&
      headerBuffer[2] === 0xff
    ) {
      detectedMimeType = 'image/jpeg';
    }
    // Check PNG Signature: 89 50 4E 47 0D 0A 1A 0A
    else if (
      headerBuffer[0] === 0x89 &&
      headerBuffer[1] === 0x50 &&
      headerBuffer[2] === 0x4e &&
      headerBuffer[3] === 0x47 &&
      headerBuffer[4] === 0x0d &&
      headerBuffer[5] === 0x0a &&
      headerBuffer[6] === 0x1a &&
      headerBuffer[7] === 0x0a
    ) {
      detectedMimeType = 'image/png';
    } else {
      fs.closeSync(fd);
      fd = null;
      return {
        isValid: false,
        error: 'File content signature verification failed: True file content does not match allowed types (PDF, JPEG, PNG).',
      };
    }

    // 2. Anti-Polyglot & Embedded Script Detection
    // Inspect up to 8KB of content to detect disguised scripts (e.g. PHP/HTML injected inside EXIF/metadata)
    const scanSize = Math.min(stats.size, 8192);
    const scanBuffer = Buffer.alloc(scanSize);
    fs.readSync(fd, scanBuffer, 0, scanSize, 0);
    fs.closeSync(fd);
    fd = null;

    const contentText = scanBuffer.toString('latin1');
    for (const pattern of DANGEROUS_PAYLOAD_PATTERNS) {
      if (pattern.test(contentText)) {
        return {
          isValid: false,
          error: 'Security rejection: Executable code or embedded script payload detected in file content.',
        };
      }
    }

    return {
      isValid: true,
      detectedMimeType,
    };
  } catch (err: any) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (_) {}
    }
    return { isValid: false, error: `Error during file signature inspection: ${err.message}` };
  }
};
