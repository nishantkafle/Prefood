import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    senderRole: { type: String, enum: ['user', 'restaurant'], required: true },
    receiverRole: { type: String, enum: ['user', 'restaurant'], required: true },
    message: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    conversationKey: { type: String, required: true, index: true }
}, {
    timestamps: true
});

chatMessageSchema.index({ conversationKey: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });
chatMessageSchema.index({ receiverId: 1, createdAt: -1 });

const chatMessageModel = mongoose.models.chatmessage || mongoose.model('chatmessage', chatMessageSchema);

export default chatMessageModel;
