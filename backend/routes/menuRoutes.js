import express from 'express';
import { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem, getMenuItem } from '../controllers/menuController.js';
import { authenticate, isRestaurant } from '../middleware/authMiddleware.js';

const menuRouter = express.Router();

// All routes require authentication and restaurant role
menuRouter.use(authenticate);
menuRouter.use(isRestaurant);

menuRouter.post('/add', addMenuItem);
menuRouter.get('/all', getMenuItems);
menuRouter.get('/:id', getMenuItem);
menuRouter.put('/:id', updateMenuItem);
menuRouter.delete('/:id', deleteMenuItem);

export default menuRouter;
