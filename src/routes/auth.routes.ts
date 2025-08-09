import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadSingle, handleUploadError } from '../services/upload.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validations/auth.validation';
import { generateToken, generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.utils';
import { emailService } from '../services/email.service';
import { User } from '../models/user.model';
import crypto from 'crypto';

const router = Router();

// Per-IP rate limiter for auth endpoints (protect against brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  }
});

// Register new user
router.post('/register', 
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate email verification token
    const emailVerificationToken = generateEmailVerificationToken();

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      emailVerificationToken
    });

    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user, emailVerificationToken);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    // Generate JWT token
    const token = generateToken((user._id as any).toString());

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        token
      }
    });
  })
);

// Login user
router.post('/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate JWT token
    const token = generateToken((user._id as any).toString());

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar
        },
        token
      }
    });
  })
);

// Verify email
router.post('/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  })
);

// Forgot password
router.post('/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  })
);

// Reset password
router.post('/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  })
);

// Get current user profile
router.get('/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  })
);

// Update user profile
router.put('/profile',
  authMiddleware,
  uploadSingle,
  handleUploadError,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const updates = req.body;
    const user = req.user!;

    // Handle avatar upload
    if (req.file) {
      updates.avatar = `/uploads/avatar/${req.file.filename}`;
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  })
);

// Change password
router.put('/change-password',
  authMiddleware,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user!;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Resend email verification
router.post('/resend-verification',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = generateEmailVerificationToken();
    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    try {
      await emailService.sendEmailVerificationReminder(user, emailVerificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  })
);

// Logout (client-side token removal)
router.post('/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

export default router; 