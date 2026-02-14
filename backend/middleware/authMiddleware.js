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
