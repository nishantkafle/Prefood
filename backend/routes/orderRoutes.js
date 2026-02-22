import express from 'express';
import { createOrder, createUserPreorder, getOrders, getOrdersForCustomer, updateOrderStatus, updateEstimatedTime, deleteOrder, getOrderForCustomer } from '../controllers/orderController.js';
import { authenticate, isRestaurant, isRestaurantOrAdmin, isUser } from '../middleware/authMiddleware.js';

const orderRouter = express.Router();

orderRouter.use(authenticate);

// User -> Restaurant preorder (dine-in)
orderRouter.post('/preorder', isUser, createUserPreorder);

// Customer tracking endpoint (authenticated customers only)
orderRouter.get('/track/:id', isUser, getOrderForCustomer);
orderRouter.get('/my', isUser, getOrdersForCustomer);

// Restaurant/Admin management for status and ETA updates
orderRouter.put('/:id/status', isRestaurantOrAdmin, updateOrderStatus);
orderRouter.put('/:id/estimated-time', isRestaurantOrAdmin, updateEstimatedTime);

// Restaurant order management
orderRouter.use(isRestaurant);

orderRouter.post('/create', createOrder);
orderRouter.get('/all', getOrders);
orderRouter.delete('/:id', deleteOrder);

export default orderRouter;
