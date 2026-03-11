import express from 'express'
import { login, logout, register, getProfile, updateRestaurantSettings, getAllRestaurants, getRestaurantMenu, adminGetStats, adminGetAllUsers, adminGetAllRestaurants, adminUpdateUser, adminUpdateRestaurant, adminDeleteUser, adminDeleteRestaurant, adminToggleRestaurantStatus } from '../controllers/authController.js';
import { authenticate, isRestaurant, isUser, isAdmin } from '../middleware/authMiddleware.js';

const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login );
authRouter.post('/logout', logout);
authRouter.get('/profile', authenticate, getProfile);
authRouter.put('/restaurant/settings', authenticate, isRestaurant, updateRestaurantSettings);
authRouter.get('/restaurants', authenticate, isUser, getAllRestaurants);
authRouter.get('/restaurant/:restaurantId/menu', authenticate, isUser, getRestaurantMenu);

// Admin routes
authRouter.get('/admin/stats', authenticate, isAdmin, adminGetStats);
authRouter.get('/admin/users', authenticate, isAdmin, adminGetAllUsers);
authRouter.get('/admin/restaurants', authenticate, isAdmin, adminGetAllRestaurants);
authRouter.put('/admin/user/:id', authenticate, isAdmin, adminUpdateUser);
authRouter.put('/admin/restaurant/:id', authenticate, isAdmin, adminUpdateRestaurant);
authRouter.patch('/admin/restaurant/:id/status', authenticate, isAdmin, adminToggleRestaurantStatus);
authRouter.delete('/admin/user/:id', authenticate, isAdmin, adminDeleteUser);
authRouter.delete('/admin/restaurant/:id', authenticate, isAdmin, adminDeleteRestaurant);

export default authRouter;