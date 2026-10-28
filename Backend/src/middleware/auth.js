const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const getBearerToken = (authHeader) => {
  if (typeof authHeader !== 'string') {
    return '';
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return '';
  }

  return token.trim();
};

const verifyAccessToken = (token) => {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret) {
    const configError = new Error('JWT_SECRET is not configured');
    configError.status = 500;
    throw configError;
  }

  const decoded = jwt.verify(token, secret);
  if (!decoded || typeof decoded !== 'object' || !decoded.id) {
    const payloadError = new jwt.JsonWebTokenError('Token payload is missing a valid user id');
    throw payloadError;
  }

  return decoded;
};

const selectAuthenticatedUser = {
  id: true,
  username: true,
  email: true,
  role: true,
  teacherId: true,
  firstName: true,
  lastName: true,
  isArchived: true,
  isVerified: true
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const token = getBearerToken(req.headers['authorization']);

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token is required'
    });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }

    return next(error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: selectAuthenticatedUser
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token - user not found'
      });
    }

    if (user.isArchived) {
      return res.status(401).json({
        status: 'error',
        message: 'Account has been archived'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is not activated. Please verify OTP first.'
      });
    }

    req.user = user;
    req.authSessionKey = Number.isInteger(decoded?.iat) ? String(decoded.iat) : '';
    next();
  } catch (error) {
    return next(error);
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const normalizedRole = req.user.role === 'ADMIN' ? 'SUPER_ADMIN' : req.user.role;
    const normalizedAllowedRoles = roles.map((role) => (role === 'ADMIN' ? 'SUPER_ADMIN' : role));

    if (!normalizedAllowedRoles.includes(normalizedRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user is super admin
const requireSuperAdmin = authorize('SUPER_ADMIN');

// Check if user is teacher or super admin
const requireTeacher = authorize('TEACHER', 'SUPER_ADMIN');

// Check if user is teacher only
const requireTeacherOnly = authorize('TEACHER');

// Check if user is student (or higher)
const requireStudent = authorize('STUDENT', 'TEACHER', 'SUPER_ADMIN');

// Check if user is student only
const requireStudentOnly = authorize('STUDENT');

// Optional authentication (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  const token = getBearerToken(req.headers['authorization']);

  if (!token) {
    req.user = null;
    req.authSessionKey = '';
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: selectAuthenticatedUser
    });

    req.user = user && !user.isArchived ? user : null;
    req.authSessionKey = Number.isInteger(decoded?.iat) ? String(decoded.iat) : '';
    next();
  } catch (error) {
    req.user = null;
    req.authSessionKey = '';
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  requireSuperAdmin,
  requireTeacher,
  requireTeacherOnly,
  requireStudent,
  requireStudentOnly,
  optionalAuth
};
