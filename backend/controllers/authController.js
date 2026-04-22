import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import menuModel from '../models/menuModel.js';
import siteSettingModel from '../models/siteSettingModel.js';
import { getIO } from '../utils/socket.js';
import { createNotification } from '../utils/notifications.js';

const FEATURED_RESTAURANT_LIMIT = 7;

export const register = async (req, res) => {
    try {
        const { name, email, password, role, restaurantName, logo, location, phone, cuisineType, restaurantType, serviceType, openingTime, closingTime, latitude, longitude } = req.body;

        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        if (!['user', 'admin', 'restaurant'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
            location: location || '',
            phone: phone || '',
            latitude: latitude || null,
            longitude: longitude || null
        };

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
        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ success: true, message: 'Registration successful' });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
    }
}
export const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.json({ success: false, message: 'Email, password and role are required' })
    }
    try {

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: 'Invalid email' })
        }

        if (user.role !== role) {
            return res.json({ success: false, message: 'Invalid role for this account' })
        }

        if (user.isActive === false) {
            return res.json({ success: false, message: 'Your account is suspended. Contact customer care for more information.' })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid Password' })
        }
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
                'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.json({
            success: true, data: {
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantName: user.restaurantName,
                logo: user.logo,
                location: user.location,
                latitude: user.latitude,
                longitude: user.longitude,
                isActive: user.isActive
            }, token
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

export const getProfile = async (req, res) => {
    try {
        const user = req.user;
        return res.json({
            success: true, data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantName: user.restaurantName,
                logo: user.logo,
                location: user.location,
                latitude: user.latitude,
                longitude: user.longitude,
                phone: user.phone,
                cuisineType: user.cuisineType,
                restaurantType: user.restaurantType,
                serviceType: user.serviceType,
                openingTime: user.openingTime,
                closingTime: user.closingTime,
                isActive: user.isActive
            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { name, logo, location, latitude, longitude } = req.body;
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (logo !== undefined) user.logo = logo;
        if (location !== undefined) user.location = location;
        if (latitude !== undefined) user.latitude = latitude;
        if (longitude !== undefined) user.longitude = longitude;

        await user.save();
        return res.json({
            success: true, message: 'Profile updated successfully', data: {
                name: user.name,
                logo: user.logo,
                email: user.email,
                role: user.role,
                location: user.location,
                latitude: user.latitude,
                longitude: user.longitude
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRestaurantSettings = async (req, res) => {
    try {
        const { restaurantName, logo, location, phone, cuisineType, restaurantType, serviceType, openingTime, closingTime, latitude, longitude } = req.body;
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
        if (latitude !== undefined) user.latitude = latitude;
        if (longitude !== undefined) user.longitude = longitude;

        await user.save();

        const io = getIO();
        if (io) {
            io.to('admin_room').emit('restaurant:updated', {
                restaurant: {
                    _id: String(user._id),
                    name: user.name,
                    email: user.email,
                    restaurantName: user.restaurantName,
                    logo: user.logo,
                    location: user.location,
                    phone: user.phone,
                    cuisineType: user.cuisineType,
                    restaurantType: user.restaurantType,
                    serviceType: user.serviceType,
                    openingTime: user.openingTime,
                    closingTime: user.closingTime,
                    isActive: user.isActive,
                    isFeaturedHome: user.isFeaturedHome,
                    latitude: user.latitude,
                    longitude: user.longitude,
                    updatedAt: user.updatedAt
                }
            });
        }

        return res.json({
            success: true, message: 'Settings updated successfully', data: {
                restaurantName: user.restaurantName,
                logo: user.logo,
                location: user.location,
                phone: user.phone,
                cuisineType: user.cuisineType,
                restaurantType: user.restaurantType,
                serviceType: user.serviceType,
                openingTime: user.openingTime,
                closingTime: user.closingTime,
                latitude: user.latitude,
                longitude: user.longitude
            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getAllRestaurants = async (req, res) => {
    try {
        const { userLat, userLng, nearby } = req.query;

        let restaurants = await userModel
            .find({ role: 'restaurant', isActive: { $ne: false } })
            .select('restaurantName logo location cuisineType restaurantType serviceType openingTime closingTime phone isActive latitude longitude')
            .lean();

        // Calculate distance if user coords are provided
        if (userLat && userLng) {
            const lat1 = parseFloat(userLat);
            const lng1 = parseFloat(userLng);

            restaurants = restaurants.map(r => {
                if (r.latitude && r.longitude) {
                    const R = 6371; // km
                    const dLat = (r.latitude - lat1) * Math.PI / 180;
                    const dLon = (r.longitude - lng1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(r.latitude * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    r.distance = R * c; // Distance in km
                } else {
                    r.distance = null;
                }
                return r;
            });

            // If nearby mode is active, filter (1km radius) and sort
            if (nearby === 'true') {
                restaurants = restaurants.filter(r => r.distance !== null && r.distance <= 1);
                restaurants.sort((a, b) => a.distance - b.distance);
            }
        }

        return res.json({ success: true, data: restaurants });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getRestaurantMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const restaurant = await userModel
            .findOne({ _id: restaurantId, role: 'restaurant', isActive: { $ne: false } })
            .select('restaurantName logo location cuisineType isActive');
        if (!restaurant) {
            return res.json({ success: false, message: 'Restaurant not found or inactive' });
        }
        const menuItems = await menuModel.find({ restaurantId });
        return res.json({ success: true, data: { restaurant, menuItems } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getPublicRestaurants = async (req, res) => {
    try {
        const { search = '', userLat, userLng, nearby } = req.query;
        const trimmed = String(search || '').trim();
        const query = { role: 'restaurant', isActive: { $ne: false } };

        if (trimmed) {
            query.$or = [
                { restaurantName: { $regex: trimmed, $options: 'i' } },
                { cuisineType: { $regex: trimmed, $options: 'i' } },
                { location: { $regex: trimmed, $options: 'i' } }
            ];
        }

        let restaurants = await userModel
            .find(query)
            .select('restaurantName logo location cuisineType restaurantType serviceType openingTime closingTime phone isFeaturedHome latitude longitude')
            .lean();

        // Calculate distance if user coords are provided
        if (userLat && userLng) {
            const lat1 = parseFloat(userLat);
            const lng1 = parseFloat(userLng);

            restaurants = restaurants.map(r => {
                if (r.latitude && r.longitude) {
                    const R = 6371; // km
                    const dLat = (r.latitude - lat1) * Math.PI / 180;
                    const dLon = (r.longitude - lng1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(r.latitude * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    r.distance = R * c; // Distance in km
                } else {
                    r.distance = null;
                }
                return r;
            });

            // If nearby mode is active, filter (1km radius) and sort
            if (nearby === 'true') {
                restaurants = restaurants.filter(r => r.distance !== null && r.distance <= 1);
                restaurants.sort((a, b) => a.distance - b.distance);
            } else {
                // Regular sort: Featured first, then by date as a fallback
                restaurants.sort((a, b) => (b.isFeaturedHome ? 1 : 0) - (a.isFeaturedHome ? 1 : 0));
            }
        } else {
            restaurants.sort((a, b) => (b.isFeaturedHome ? 1 : 0) - (a.isFeaturedHome ? 1 : 0));
        }

        return res.json({ success: true, data: restaurants });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getPublicRestaurantMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const restaurant = await userModel
            .findOne({ _id: restaurantId, role: 'restaurant', isActive: { $ne: false } })
            .select('restaurantName logo location cuisineType isActive');

        if (!restaurant) {
            return res.json({ success: false, message: 'Restaurant not found or inactive' });
        }

        const menuItems = await menuModel.find({ restaurantId }).sort({ createdAt: -1 });
        return res.json({ success: true, data: { restaurant, menuItems } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getPublicHomeData = async (req, res) => {
    try {
        const featuredRestaurants = await userModel
            .find({ role: 'restaurant', isActive: { $ne: false }, isFeaturedHome: true })
            .select('restaurantName logo location cuisineType openingTime closingTime')
            .sort({ updatedAt: -1 })
            .limit(FEATURED_RESTAURANT_LIMIT);

        const bannerSetting = await siteSettingModel.findOne({ key: 'homeBannerImage' });

        return res.json({
            success: true,
            data: {
                bannerImage: bannerSetting?.value || '',
                featuredRestaurants
            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ─── ADMIN CONTROLLERS ───────────────────────────────────────────────────────

export const adminGetStats = async (req, res) => {
    try {
        const totalUsers = await userModel.countDocuments({ role: 'user' });
        const totalRestaurants = await userModel.countDocuments({ role: 'restaurant' });
        return res.json({ success: true, data: { totalUsers, totalRestaurants } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminGetAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({ role: 'user' }).select('-password');
        return res.json({ success: true, data: users });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminGetAllRestaurants = async (req, res) => {
    try {
        const restaurants = await userModel.find({ role: 'restaurant' }).select('-password');
        return res.json({ success: true, data: restaurants });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminUpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        const user = await userModel.findOne({ _id: id, role: 'user' });
        if (!user) return res.json({ success: false, message: 'User not found' });
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        await user.save();
        return res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminUpdateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, restaurantName, location, phone, cuisineType, restaurantType, serviceType, openingTime, closingTime, isActive } = req.body;
        const restaurant = await userModel.findOne({ _id: id, role: 'restaurant' });
        if (!restaurant) return res.json({ success: false, message: 'Restaurant not found' });
        if (name !== undefined) restaurant.name = name;
        if (email !== undefined) restaurant.email = email;
        if (restaurantName !== undefined) restaurant.restaurantName = restaurantName;
        if (location !== undefined) restaurant.location = location;
        if (phone !== undefined) restaurant.phone = phone;
        if (cuisineType !== undefined) restaurant.cuisineType = cuisineType;
        if (restaurantType !== undefined) restaurant.restaurantType = restaurantType;
        if (serviceType !== undefined) restaurant.serviceType = serviceType;
        if (openingTime !== undefined) restaurant.openingTime = openingTime;
        if (closingTime !== undefined) restaurant.closingTime = closingTime;
        if (isActive !== undefined) restaurant.isActive = !!isActive;
        await restaurant.save();
        return res.json({ success: true, message: 'Restaurant updated successfully', data: restaurant });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminToggleRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.json({ success: false, message: 'isActive must be a boolean value' });
        }

        const restaurant = await userModel.findOne({ _id: id, role: 'restaurant' });
        if (!restaurant) return res.json({ success: false, message: 'Restaurant not found' });

        restaurant.isActive = isActive;
        await restaurant.save();

        await createNotification({
            recipientId: restaurant._id,
            type: 'account-status',
            title: isActive ? 'Account reactivated' : 'Account suspended',
            message: isActive
                ? 'Your restaurant account has been reactivated.'
                : 'Your account is suspended. Contact customer care for more information.',
            meta: {
                route: '/restaurant/dashboard',
                userId: String(restaurant._id),
                isActive
            }
        });

        const io = getIO();
        if (io) {
            io.to('admin_room').emit('restaurant:statusChanged', {
                restaurant: {
                    _id: String(restaurant._id),
                    name: restaurant.name,
                    email: restaurant.email,
                    restaurantName: restaurant.restaurantName,
                    logo: restaurant.logo,
                    location: restaurant.location,
                    phone: restaurant.phone,
                    cuisineType: restaurant.cuisineType,
                    restaurantType: restaurant.restaurantType,
                    serviceType: restaurant.serviceType,
                    openingTime: restaurant.openingTime,
                    closingTime: restaurant.closingTime,
                    isActive: restaurant.isActive,
                    isFeaturedHome: restaurant.isFeaturedHome,
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude,
                    updatedAt: restaurant.updatedAt
                }
            });

            io.to(`user_${restaurant._id.toString()}`).emit('restaurant:statusChanged', {
                userId: String(restaurant._id),
                isActive,
                message: isActive
                    ? 'Your account has been reactivated.'
                    : 'Your account is suspended. Contact customer care for more information.'
            });
        }

        return res.json({
            success: true,
            message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: restaurant
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminToggleRestaurantFeatured = async (req, res) => {
    try {
        const { id } = req.params;
        const { isFeaturedHome } = req.body;

        if (typeof isFeaturedHome !== 'boolean') {
            return res.json({ success: false, message: 'isFeaturedHome must be a boolean value' });
        }

        const restaurant = await userModel.findOne({ _id: id, role: 'restaurant' });
        if (!restaurant) return res.json({ success: false, message: 'Restaurant not found' });

        if (isFeaturedHome) {
            const featuredCount = await userModel.countDocuments({
                role: 'restaurant',
                isFeaturedHome: true,
                _id: { $ne: id }
            });

            if (featuredCount >= FEATURED_RESTAURANT_LIMIT) {
                return res.json({
                    success: false,
                    message: `Only ${FEATURED_RESTAURANT_LIMIT} restaurants can be featured on homepage`
                });
            }
        }

        restaurant.isFeaturedHome = isFeaturedHome;
        await restaurant.save();

        const io = getIO();
        if (io) {
            io.to('admin_room').emit('restaurant:updated', {
                restaurant: {
                    _id: String(restaurant._id),
                    name: restaurant.name,
                    email: restaurant.email,
                    restaurantName: restaurant.restaurantName,
                    logo: restaurant.logo,
                    location: restaurant.location,
                    phone: restaurant.phone,
                    cuisineType: restaurant.cuisineType,
                    restaurantType: restaurant.restaurantType,
                    serviceType: restaurant.serviceType,
                    openingTime: restaurant.openingTime,
                    closingTime: restaurant.closingTime,
                    isActive: restaurant.isActive,
                    isFeaturedHome: restaurant.isFeaturedHome,
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude,
                    updatedAt: restaurant.updatedAt
                }
            });
        }

        return res.json({
            success: true,
            message: `Restaurant ${isFeaturedHome ? 'featured' : 'removed from featured'} successfully`,
            data: restaurant
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminGetHomeBanner = async (req, res) => {
    try {
        const bannerSetting = await siteSettingModel.findOne({ key: 'homeBannerImage' });
        return res.json({ success: true, data: { bannerImage: bannerSetting?.value || '' } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminUpdateHomeBanner = async (req, res) => {
    try {
        const { bannerImage } = req.body;

        if (typeof bannerImage !== 'string') {
            return res.json({ success: false, message: 'bannerImage must be a string' });
        }

        await siteSettingModel.findOneAndUpdate(
            { key: 'homeBannerImage' },
            { value: bannerImage },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: 'Homepage banner updated successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await userModel.findOneAndDelete({ _id: id, role: 'user' });
        if (!deleted) return res.json({ success: false, message: 'User not found' });
        return res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const adminDeleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await userModel.findOneAndDelete({ _id: id, role: 'restaurant' });
        if (!deleted) return res.json({ success: false, message: 'Restaurant not found' });
        return res.json({ success: true, message: 'Restaurant deleted successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ─── END ADMIN CONTROLLERS ────────────────────────────────────────────────────

export const logout = async (req, res) => {
    try {

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
                'none' : 'strict',
        })


        return res.json({ success: true, message: "Logged Out" })

    } catch (error) {

        return res.json({ success: false, message: error.message });
    }
}

