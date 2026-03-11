import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    role: {type: String, enum: ['user', 'admin', 'restaurant'], required: true},
    verifyOtp: {type: String, default: ''},
    veryfyOtpExpireAt: {type: Number, default: 0},
    isAccountVerified: {type: Boolean, default: false},
    resetOtp: {type: String, default:''},
    resetOtpExpireAt: {type: Number, default: 0},
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
    isActive: {type: Boolean, default: true},
})
const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;