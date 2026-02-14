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
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    estimatedTime: { type: Number, required: true }, // in minutes
    status: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }
}, {
    timestamps: true
});

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);

export default orderModel;
