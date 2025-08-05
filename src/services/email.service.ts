import nodemailer from 'nodemailer';
import { IUser } from '../models/user.model';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env['EMAIL_HOST'],
      port: parseInt(process.env['EMAIL_PORT'] || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env['EMAIL_USER'],
        pass: process.env['EMAIL_PASS'],
      },
    });
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const mailOptions = {
        from: process.env['EMAIL_FROM'],
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(user: IUser, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env['CLIENT_URL']}/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to MelikShop!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for registering with MelikShop. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The MelikShop Team</p>
      </div>
    `;

    await this.sendEmail(user.email, 'Welcome to MelikShop - Verify Your Email', html);
  }

  async sendPasswordResetEmail(user: IUser, resetToken: string): Promise<void> {
    const resetUrl = `${process.env['CLIENT_URL']}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested a password reset for your MelikShop account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The MelikShop Team</p>
      </div>
    `;

    await this.sendEmail(user.email, 'Password Reset Request - MelikShop', html);
  }

  async sendEmailVerificationReminder(user: IUser, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env['CLIENT_URL']}/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification Reminder</h2>
        <p>Hi ${user.firstName},</p>
        <p>We noticed that you haven't verified your email address yet. Please verify your email to access all features of MelikShop:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Best regards,<br>The MelikShop Team</p>
      </div>
    `;

    await this.sendEmail(user.email, 'Email Verification Reminder - MelikShop', html);
  }

  async sendOrderConfirmation(user: IUser, orderDetails: any): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
          <p><strong>Total Amount:</strong> $${orderDetails.total}</p>
          <p><strong>Status:</strong> ${orderDetails.status}</p>
        </div>
        <p>We'll send you updates as your order progresses.</p>
        <p>Best regards,<br>The MelikShop Team</p>
      </div>
    `;

    await this.sendEmail(user.email, 'Order Confirmation - MelikShop', html);
  }
}

export const emailService = new EmailService(); 