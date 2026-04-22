import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['user', 'admin', 'restaurant'], required: true},

    // Restaurant-specific fields
    restaurantName: {type: String, default: ''},
    logo: {type: String, default: ''},
    location: {type: String, default: ''},
    phone: {type: String, default: ''},
    cuisineType: {type: String, default: ''},
    restaurantType: {type: String, default: ''},
    serviceType: {type: String, default: ''},
    openingTime: {type: String, default: ''},
    closingTime: {type: String, default: ''},
    latitude: {type: Number, default: null},
    longitude: {type: Number, default: null},
    isActive: {type: Boolean, default: true},
    isFeaturedHome: {type: Boolean, default: false},
})
const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;