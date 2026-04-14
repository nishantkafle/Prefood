import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'menuitem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    prepTime: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    dineInAt: { type: Date, default: null },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    estimatedTime: { type: Number, required: true }, // in minutes
    paymentMethod: { type: String, enum: ['cash', 'esewa'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    paymentTransactionUuid: { type: String, default: '' },
    acceptedAt: { type: Date, default: null },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'accepted', 'cooking', 'preparing', 'ready', 'completed', 'cancelled', 'delayed'],
        default: 'pending'
    },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }
}, {
    timestamps: true
});

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);

export default orderModel;
