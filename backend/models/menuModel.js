import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    prepTime: { type: Number, required: true }, // in minutes
    category: { type: String, enum: ['veg', 'non-veg', 'vegan'], required: true },
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    image: { type: String, default: '' }, // base64 or URL
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }
}, {
    timestamps: true
});

const menuModel = mongoose.models.menuitem || mongoose.model('menuitem', menuItemSchema);

export default menuModel;
