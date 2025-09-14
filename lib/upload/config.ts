import multer from 'multer'
import path from 'path'
import { TRPCError } from '@trpc/server'

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'text/csv',
    'application/json',
    'text/plain',
    'application/octet-stream', // For .tdf files
  ],
  allowedExtensions: ['.csv', '.json', '.txt', '.tdf'],
  uploadDir: process.env.UPLOAD_DIR || './uploads',
}

// Multer configuration for file uploads
export const multerConfig = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 1, // Only allow one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`))
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase()
    if (!UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
      return cb(new Error(`Invalid file extension. Allowed extensions: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`))
    }

    cb(null, true)
  },
})

// File validation function
export const validateUploadedFile = (file: Express.Multer.File) => {
  if (!file) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No file provided'
    })
  }

  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `File too large. Maximum size: ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`
    })
  }

  const ext = path.extname(file.originalname).toLowerCase()
  if (!UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid file extension. Allowed: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`
    })
  }

  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid file type. Allowed: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`
    })
  }

  return true
}

// Get file type from extension
export const getFileType = (filename: string): 'CSV' | 'JSON' | 'TDF' => {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.csv':
    case '.txt':
      return 'CSV'
    case '.json':
      return 'JSON'
    case '.tdf':
      return 'TDF'
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unsupported file type'
      })
  }
}