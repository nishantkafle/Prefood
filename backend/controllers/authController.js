import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

export const register = async (req, res) => {
    try {
        const {name, email, password, role, restaurantName, logo, location, phone, cuisineType, restaurantType, serviceType, openingTime, closingTime} = req.body;

        // Validation
        if(!name || !email || !password || !role){
            return res.status(400).json({success: false, message: 'All fields are required'});
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({success: false, message: 'Invalid email format'});
        }

        // Password validation
        if(password.length < 6){
            return res.status(400).json({success: false, message: 'Password must be at least 6 characters'});
        }

        if(!['user', 'admin', 'restaurant'].includes(role)){
            return res.status(400).json({success: false, message: 'Invalid role'});
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({email});
        if(existingUser){
            return res.status(400).json({success: false, message: "Email already registered"});
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const userData = {name, email, password: hashedPassword, role};

        // Add restaurant-specific fields if registering as restaurant
        if (role === 'restaurant') {
            userData.restaurantName = restaurantName || '';
            userData.logo = logo || '';
            userData.location = location || '';
            userData.phone = phone || '';
            userData.cuisineType = cuisineType || '';
            userData.restaurantType = restaurantType || '';
            userData.serviceType = serviceType || '';
            userData.openingTime = openingTime || '';
            userData.closingTime = closingTime || '';
        }

        const user = new userModel(userData);
        await user.save();

        // Generate token
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const token = jwt.sign({id: user._id}, jwtSecret, {expiresIn:'7d'});
        
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        return res.status(200).json({success: true, message: 'Registration successful'});

    } catch (error){
        console.error('Registration error:', error);
        return res.status(500).json({success: false, message: error.message || 'Server error during registration'});
    }
}       
 export const login = async (req, res) =>{
    const {email, password, role} = req.body;

    if(!email || !password || !role){
        return res.json({success: false, message: 'Email, password and role are required'})
    }
    try{

        const user = await userModel.findOne({email});

        if(!user){
            return res.json({success: false, message: 'Invalid email'})
        }

        if(user.role !== role){
            return res.json({success: false, message: 'Invalid role for this account'})
        }
        
        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.json({success: false, message: 'Invalid Password'})
        }
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const token = jwt.sign({id: user._id}, jwtSecret, {expiresIn:'7d'});

         res.cookie('token',token,{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
            'none' : 'strict',
            maxAge : 7 * 24 * 60 * 60 * 1000
         })

         return res.json({success: true, data: {
            name: user.name,
            email: user.email,
            role: user.role,
            restaurantName: user.restaurantName,
            logo: user.logo,
            location: user.location
         }});

    }catch (error) {
        return res.json({ success: false, message: error.message});
    }
 }

 export const getProfile = async (req, res) => {
    try {
        const user = req.user;
        return res.json({ success: true, data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            restaurantName: user.restaurantName,
            logo: user.logo,
            location: user.location,
            phone: user.phone,
            cuisineType: user.cuisineType,
            restaurantType: user.restaurantType,
            serviceType: user.serviceType,
            openingTime: user.openingTime,
            closingTime: user.closingTime
        }});
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
 };

 export const updateRestaurantSettings = async (req, res) => {
    try {
        const { restaurantName, logo, location, phone, cuisineType, restaurantType, serviceType, openingTime, closingTime } = req.body;
        const user = await userModel.findById(req.user._id);

        if (!user || user.role !== 'restaurant') {
            return res.json({ success: false, message: 'Restaurant not found' });
        }

        if (restaurantName !== undefined) user.restaurantName = restaurantName;
        if (logo !== undefined) user.logo = logo;
        if (location !== undefined) user.location = location;
        if (phone !== undefined) user.phone = phone;
        if (cuisineType !== undefined) user.cuisineType = cuisineType;
        if (restaurantType !== undefined) user.restaurantType = restaurantType;
        if (serviceType !== undefined) user.serviceType = serviceType;
        if (openingTime !== undefined) user.openingTime = openingTime;
        if (closingTime !== undefined) user.closingTime = closingTime;

        await user.save();
        return res.json({ success: true, message: 'Settings updated successfully', data: {
            restaurantName: user.restaurantName,
            logo: user.logo,
            location: user.location,
            phone: user.phone,
            cuisineType: user.cuisineType,
            restaurantType: user.restaurantType,
            serviceType: user.serviceType,
            openingTime: user.openingTime,
            closingTime: user.closingTime
        }});
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
 };

 export const getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await userModel.find({ role: 'restaurant' }).select('restaurantName logo location cuisineType restaurantType serviceType openingTime closingTime phone');
        return res.json({ success: true, data: restaurants });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
 };

 export const getRestaurantMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const menuModel = (await import('../models/menuModel.js')).default;
        const restaurant = await userModel.findById(restaurantId).select('restaurantName logo location cuisineType');
        if (!restaurant) {
            return res.json({ success: false, message: 'Restaurant not found' });
        }
        const menuItems = await menuModel.find({ restaurantId });
        return res.json({ success: true, data: { restaurant, menuItems } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
 };

 export const logout = async (req, res) =>{
    try{

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
            'none' : 'strict',
        })


        return res.json({success: true, message: "Logged Out"})

    } catch (error){

        return res.json({ success: false, message: error.message});
    }
 } 
 
