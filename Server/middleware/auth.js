const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    if (!decoded?.id) {
      return res.status(401).json({ message: 'Token is not valid for user routes' });
    }
    req.userId = decoded.id;
    req.user = { _id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Enhanced auth middleware that fetches user details
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Handle both regular user tokens (id) and admin tokens (adminId)
    const userId = decoded.id || decoded.adminId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // If it's an admin token, create admin user object
    if (decoded.adminId && decoded.role === 'admin') {
      req.user = {
        _id: decoded.adminId,
        email: decoded.email,
        role: 'admin'
      };
      return next();
    }
    
    // Fetch full user details for regular users
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based access control middleware
const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (req.user.role !== role) {
        return res.status(403).json({ 
          message: `Only ${role}s can access this resource`,
          requiredRole: role,
          userRole: req.user.role,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Error checking user role' });
    }
  };
};

// Export default middleware as function while keeping named exports for other usages
module.exports = authMiddleware;
module.exports.auth = auth;
module.exports.requireRole = requireRole;
module.exports.verifyToken = authMiddleware;
