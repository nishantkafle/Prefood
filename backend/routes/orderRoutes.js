import express from 'express';
import { createOrder, createUserPreorder, getOrders, updateOrderStatus, updateEstimatedTime, deleteOrder } from '../controllers/orderController.js';
import { authenticate, isRestaurant } from '../middleware/authMiddleware.js';

const orderRouter = express.Router();

orderRouter.use(authenticate);

// User -> Restaurant preorder (dine-in)
orderRouter.post('/preorder', createUserPreorder);

// Restaurant order management
orderRouter.use(isRestaurant);

orderRouter.post('/create', createOrder);
orderRouter.get('/all', getOrders);
orderRouter.put('/:id/status', updateOrderStatus);
orderRouter.put('/:id/estimated-time', updateEstimatedTime);
orderRouter.delete('/:id', deleteOrder);

export default orderRouter;
