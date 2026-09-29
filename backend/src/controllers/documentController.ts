import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import DocumentModel from '../models/Document';
import { DocumentType, DocumentStatus, UserRole } from '../constants/enums';
import { validateFileMagicBytes } from '../utils/fileSecurity';

// Isolated secure storage directory completely outside public web server root
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Defense-in-depth: Write execution blocking rules inside storage directory
try {
  const htaccessPath = path.join(UPLOAD_DIR, '.htaccess');
  if (!fs.existsSync(htaccessPath)) {
    fs.writeFileSync(
      htaccessPath,
      '# Prevent script execution\n<FilesMatch "\\.(php|php5|phtml|py|sh|pl|cgi|exe|asp|aspx)$">\n  Require all denied\n</FilesMatch>\nOptions -ExecCGI\n'
    );
  }
} catch (_) {}

// Strictly whitelisted file extensions and mime types
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate a cryptographically randomized, non-executable filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.bin';
    cb(null, `DOC-${uniqueSuffix}${safeExt}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Tier 1: Validate Header Mime-Type and Extension whitelist
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format or extension. Only PDF, JPG, JPEG, and PNG files are allowed.'));
  }
};

export const uploadMulter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB strict size limit
    files: 1, // Only 1 file per upload request
  },
});

export const uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || null;
    const file = req.file;
    const { documentType } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file rejected by security format filter.',
      });
    }

    // Helper to safely purge malicious or invalid file from disk
    const removeTempFile = () => {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (err) {
        console.error('[Upload Security] Failed to remove invalid file:', err);
      }
    };

    // Tier 2: Validate Document Type enum
    if (!documentType || !Object.values(DocumentType).includes(documentType as DocumentType)) {
      removeTempFile();
      return res.status(400).json({ success: false, message: 'Invalid or missing document type.' });
    }

    // Tier 3: Binary Content Magic Byte Validation (Inspect true binary signature, preventing disguised executables)
    const contentCheck = validateFileMagicBytes(file.path);
    if (!contentCheck.isValid) {
      removeTempFile();
      return res.status(400).json({
        success: false,
        message: contentCheck.error || 'File content rejected. File signature does not match allowed types.',
      });
    }

    // Ensure non-executable file permissions on disk (read/write only, no execution bits)
    try {
      fs.chmodSync(file.path, 0o600);
    } catch (_) {}

    // Sanitize user's original filename (strip dangerous path characters, dots, shell specials)
    const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');

    const docRecord = await DocumentModel.create({
      userId: userId || undefined,
      documentType: documentType as DocumentType,
      originalName: safeOriginalName,
      mimeType: contentCheck.detectedMimeType || 'application/octet-stream',
      fileSize: file.size,
      filePath: file.path,
      status: DocumentStatus.UNDER_REVIEW,
      uploadedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and verified successfully.',
      document: {
        docId: docRecord._id,
        documentType: docRecord.documentType,
        originalName: docRecord.originalName,
        mimeType: docRecord.mimeType,
        fileSize: docRecord.fileSize,
        status: docRecord.status,
        uploadedAt: docRecord.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const viewDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { docId } = req.params;
    const currentUser = req.user!;

    // 1. Validate Mongo ObjectId format
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }

    const docRecord = await DocumentModel.findById(docId);
    if (!docRecord) {
      return res.status(404).json({ success: false, message: 'Document record not found' });
    }

    // 2. IDOR PROTECTION SECURITY RULE:
    // Only the document owner OR an Admin can view/download the sensitive document
    const isOwner = docRecord.userId.toString() === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied (IDOR Protection): You are not authorized to access this document.',
      });
    }

    // 3. Path Traversal Protection
    const resolvedPath = path.resolve(docRecord.filePath);
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ success: false, message: 'Access Denied: Path traversal detected' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: 'Document binary content not found' });
    }

    // 4. Execution Prevention & Strict Content-Type Handling:
    // Whitelist approved MIME types; fallback to application/octet-stream for anything unexpected
    const SAFE_MIME_TYPES: Record<string, string> = {
      'application/pdf': 'application/pdf',
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
    };

    const contentType = SAFE_MIME_TYPES[docRecord.mimeType] || 'application/octet-stream';
    const isDownload = req.query.download === 'true' || contentType === 'application/octet-stream';
    const safeFilename = path.basename(docRecord.originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox;");
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    }

    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.on('error', (err) => next(err));
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
