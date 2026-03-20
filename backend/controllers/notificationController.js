import notificationModel from '../models/notificationModel.js';

export const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationModel
            .find({ recipientId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        const unreadCount = await notificationModel.countDocuments({ recipientId: req.user._id, isRead: false });

        return res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await notificationModel.findOneAndUpdate(
            { _id: id, recipientId: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.json({ success: true, data: notification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await notificationModel.updateMany({ recipientId: req.user._id, isRead: false }, { isRead: true });
        return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
