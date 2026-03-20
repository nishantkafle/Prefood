import mongoose from 'mongoose';
import chatMessageModel from '../models/chatMessageModel.js';
import userModel from '../models/userModel.js';
import { getIO } from '../utils/socket.js';
import { createNotification } from '../utils/notifications.js';

const ALLOWED_ROLES = ['user', 'restaurant'];

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const buildConversationKey = (firstUserId, secondUserId) => {
    return [String(firstUserId), String(secondUserId)].sort().join(':');
};

const canChatWith = (senderRole, receiverRole) => {
    return ALLOWED_ROLES.includes(senderRole) && ALLOWED_ROLES.includes(receiverRole) && senderRole !== receiverRole;
};

export const getConversations = async (req, res) => {
    try {
        const currentUser = req.user;

        if (!ALLOWED_ROLES.includes(currentUser.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const messages = await chatMessageModel
            .find({
                $or: [
                    { senderId: currentUser._id },
                    { receiverId: currentUser._id }
                ]
            })
            .sort({ createdAt: -1 })
            .lean();

        const seen = new Set();
        const latestPerConversation = [];

        for (const message of messages) {
            if (!seen.has(message.conversationKey)) {
                seen.add(message.conversationKey);
                latestPerConversation.push(message);
            }
        }

        const counterpartIds = latestPerConversation.map((message) => (
            String(message.senderId) === String(currentUser._id)
                ? message.receiverId
                : message.senderId
        ));

        const counterparts = await userModel
            .find({ _id: { $in: counterpartIds } })
            .select('name role restaurantName logo location phone')
            .lean();

        const counterpartMap = new Map(counterparts.map((user) => [String(user._id), user]));

        const data = latestPerConversation
            .map((message) => {
                const otherUserId = String(message.senderId) === String(currentUser._id)
                    ? String(message.receiverId)
                    : String(message.senderId);
                const otherUser = counterpartMap.get(otherUserId);
                if (!otherUser) return null;

                return {
                    conversationKey: message.conversationKey,
                    otherUser: {
                        _id: otherUser._id,
                        name: otherUser.name,
                        role: otherUser.role,
                        restaurantName: otherUser.restaurantName,
                        logo: otherUser.logo,
                        location: otherUser.location,
                        phone: otherUser.phone
                    },
                    lastMessage: message.message || (message.image ? 'Image' : ''),
                    lastMessageAt: message.createdAt,
                    lastMessageFromMe: String(message.senderId) === String(currentUser._id)
                };
            })
            .filter(Boolean);

        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMessagesWithUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { otherUserId } = req.params;

        if (!isValidObjectId(otherUserId)) {
            return res.status(400).json({ success: false, message: 'Invalid user id' });
        }

        if (String(otherUserId) === String(currentUser._id)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation' });
        }

        const otherUser = await userModel
            .findById(otherUserId)
            .select('name role restaurantName logo location phone');

        if (!otherUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!canChatWith(currentUser.role, otherUser.role)) {
            return res.status(403).json({ success: false, message: 'Chat is only allowed between user and restaurant' });
        }

        const conversationKey = buildConversationKey(currentUser._id, otherUser._id);

        const messages = await chatMessageModel
            .find({ conversationKey })
            .sort({ createdAt: 1 })
            .lean();

        return res.json({
            success: true,
            data: {
                conversationKey,
                otherUser,
                messages
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const sendMessageToUser = async (req, res) => {
    try {
        const sender = req.user;
        const { receiverId } = req.params;
        const { message, image } = req.body;

        if (!isValidObjectId(receiverId)) {
            return res.status(400).json({ success: false, message: 'Invalid receiver id' });
        }

        const trimmedMessage = String(message || '').trim();
        const normalizedImage = String(image || '').trim();

        if (!trimmedMessage && !normalizedImage) {
            return res.status(400).json({ success: false, message: 'Message or image is required' });
        }

        if (String(receiverId) === String(sender._id)) {
            return res.status(400).json({ success: false, message: 'Invalid receiver' });
        }

        const receiver = await userModel.findById(receiverId).select('role');
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        if (!canChatWith(sender.role, receiver.role)) {
            return res.status(403).json({ success: false, message: 'Chat is only allowed between user and restaurant' });
        }

        const conversationKey = buildConversationKey(sender._id, receiver._id);

        const newMessage = await chatMessageModel.create({
            senderId: sender._id,
            receiverId,
            senderRole: sender.role,
            receiverRole: receiver.role,
            message: trimmedMessage,
            image: normalizedImage,
            conversationKey
        });

        await createNotification({
            recipientId: receiverId,
            type: 'message',
            title: sender.role === 'restaurant' ? (sender.restaurantName || sender.name || 'Restaurant') : (sender.name || 'User'),
            message: trimmedMessage || 'Sent you an image',
            meta: {
                route: receiver.role === 'restaurant' ? '/restaurant/messages' : `/user/chats?restaurantId=${sender._id}`,
                chatUserId: String(sender._id)
            }
        });

        const io = getIO();
        if (io) {
            io.to(`user_${String(sender._id)}`).emit('chat:newMessage', newMessage);
            io.to(`user_${String(receiverId)}`).emit('chat:newMessage', newMessage);
        }

        return res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
