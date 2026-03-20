import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController.js';

const notificationRouter = express.Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', getNotifications);
notificationRouter.patch('/:id/read', markNotificationRead);
notificationRouter.patch('/read-all', markAllNotificationsRead);

export default notificationRouter;
