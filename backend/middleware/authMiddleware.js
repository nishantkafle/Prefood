import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.json({ success: false, message: 'Authentication required' });
        }

        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, jwtSecret);
        const user = await userModel.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.json({ success: false, message: 'Invalid token' });
    }
};

export const isRestaurant = (req, res, next) => {
    if (req.user && req.user.role === 'restaurant') {
        next();
    } else {
        return res.json({ success: false, message: 'Restaurant access required' });
    }
};

export const isRestaurantOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'restaurant' || req.user.role === 'admin')) {
        next();
    } else {
        return res.json({ success: false, message: 'Restaurant or admin access required' });
    }
};

export const isUser = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next();
    } else {
        return res.json({ success: false, message: 'User access required' });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.json({ success: false, message: 'Admin access required' });
    }
};
