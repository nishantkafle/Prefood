import express from 'express'
import { login, logout, register, getProfile, updateRestaurantSettings, getAllRestaurants, getRestaurantMenu } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login );
authRouter.post('/logout', logout);
authRouter.get('/profile', authenticate, getProfile);
authRouter.put('/restaurant/settings', authenticate, updateRestaurantSettings);
authRouter.get('/restaurants', authenticate, getAllRestaurants);
authRouter.get('/restaurant/:restaurantId/menu', authenticate, getRestaurantMenu);

export default authRouter;