import notificationModel from '../models/notificationModel.js';
import { getIO } from './socket.js';

export const createNotification = async ({ recipientId, type, title, message, meta = {} }) => {
    if (!recipientId) return null;

    const notification = await notificationModel.create({
        recipientId,
        type,
        title,
        message,
        meta
    });

    const io = getIO();
    if (io) {
        io.to(`user_${String(recipientId)}`).emit('notification:new', notification);
    }

    return notification;
};
