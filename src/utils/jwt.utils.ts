import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateToken = (userId: string): string => {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return (jwt.sign as any)(
    { userId },
    secret,
    { expiresIn: process.env['JWT_EXPIRES_IN'] || '7d' }
  );
};

export const verifyToken = (token: string): { userId: string } => {
  try {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, secret) as { userId: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generatePasswordResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return (jwt.sign as any)(
    { userId, type: 'refresh' },
    secret,
    { expiresIn: '30d' }
  );
};

export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  try {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    const decoded = jwt.verify(token, secret) as { userId: string; type: string };
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}; 