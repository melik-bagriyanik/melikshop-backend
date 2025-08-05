import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { 
  uploadSingle, 
  uploadMultiple, 
  uploadFields, 
  handleUploadError,
  deleteFile,
  getFileUrl
} from '../services/upload.service';
import path from 'path';
import fs from 'fs';

const router = Router();

// Upload single file
router.post('/single',
  authMiddleware,
  uploadSingle,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = getFileUrl(req.file.path);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileUrl
        }
      }
    });
  })
);

// Upload multiple files
router.post('/multiple',
  authMiddleware,
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.path)
    }));

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });
  })
);

// Upload specific field types
router.post('/fields',
  authMiddleware,
  uploadFields,
  handleUploadError,
  asyncHandler(async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles: any = {};

    for (const [fieldName, fieldFiles] of Object.entries(files)) {
      uploadedFiles[fieldName] = fieldFiles.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: getFileUrl(file.path)
      }));
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files: uploadedFiles
      }
    });
  })
);

// Delete uploaded file
router.delete('/:filename',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { field } = req.query;

    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Field parameter is required'
      });
    }

    const filePath = path.join(__dirname, '../../uploads', field as string, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    try {
      await deleteFile(filePath);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  })
);

// Get file info
router.get('/:filename/info',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { field } = req.query;

    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Field parameter is required'
      });
    }

    const filePath = path.join(__dirname, '../../uploads', field as string, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    const fileUrl = getFileUrl(filePath);

    res.json({
      success: true,
      data: {
        filename,
        originalName: filename,
        size: stats.size,
        url: fileUrl,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    });
  })
);

// List uploaded files (admin only)
router.get('/list/:field',
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { field } = req.params;
    const uploadPath = path.join(__dirname, '../../uploads', field);

    // Check if directory exists
    if (!fs.existsSync(uploadPath)) {
      return res.json({
        success: true,
        data: {
          files: [],
          count: 0
        }
      });
    }

    try {
      const files = fs.readdirSync(uploadPath);
      const fileList = files.map(filename => {
        const filePath = path.join(uploadPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          url: getFileUrl(filePath),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      });

      res.json({
        success: true,
        data: {
          files: fileList,
          count: fileList.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to list files'
      });
    }
  })
);

// Bulk delete files (admin only)
router.delete('/bulk/:field',
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { field } = req.params;
    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Filenames array is required'
      });
    }

    const uploadPath = path.join(__dirname, '../../uploads', field);
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const filename of filenames) {
      const filePath = path.join(uploadPath, filename);
      
      if (fs.existsSync(filePath)) {
        try {
          await deleteFile(filePath);
          deletedFiles.push(filename);
        } catch (error) {
          failedFiles.push(filename);
        }
      } else {
        failedFiles.push(filename);
      }
    }

    res.json({
      success: true,
      message: 'Bulk delete completed',
      data: {
        deletedFiles,
        failedFiles,
        totalDeleted: deletedFiles.length,
        totalFailed: failedFiles.length
      }
    });
  })
);

export default router; 