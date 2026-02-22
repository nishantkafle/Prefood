import express from 'express'
import { login, logout, register, getProfile, updateRestaurantSettings, getAllRestaurants, getRestaurantMenu } from '../controllers/authController.js';
import { authenticate, isRestaurant, isUser } from '../middleware/authMiddleware.js';

const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login );
authRouter.post('/logout', logout);
authRouter.get('/profile', authenticate, getProfile);
authRouter.put('/restaurant/settings', authenticate, isRestaurant, updateRestaurantSettings);
authRouter.get('/restaurants', authenticate, isUser, getAllRestaurants);
authRouter.get('/restaurant/:restaurantId/menu', authenticate, isUser, getRestaurantMenu);

export default authRouter;