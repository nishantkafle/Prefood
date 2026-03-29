import express from 'express';
import { handleEsewaFailure, handleEsewaIPN, handleEsewaSuccess, initiateEsewaPayment } from '../controllers/esewaController.js';
import { authenticate, isUser } from '../middleware/authMiddleware.js';

const esewaRouter = express.Router();

esewaRouter.post('/initiate', authenticate, isUser, initiateEsewaPayment);
esewaRouter.get('/success', handleEsewaSuccess);
esewaRouter.get('/failure', handleEsewaFailure);
esewaRouter.post('/ipn', handleEsewaIPN);

export default esewaRouter;
