import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getConversations, getMessagesWithUser, sendMessageToUser } from '../controllers/chatController.js';

const chatRouter = express.Router();

chatRouter.use(authenticate);

chatRouter.get('/conversations', getConversations);
chatRouter.get('/messages/:otherUserId', getMessagesWithUser);
chatRouter.post('/messages/:receiverId', sendMessageToUser);

export default chatRouter;
