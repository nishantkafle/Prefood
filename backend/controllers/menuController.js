import menuModel from '../models/menuModel.js';
import { getIO } from '../utils/socket.js';

// Add new menu item
export const addMenuItem = async (req, res) => {
    try {
        const { name, description, prepTime, category, price, image, isActive } = req.body;
        const restaurantId = req.user._id;

        if (!name || !description || !prepTime || !category || !price) {
            return res.json({ success: false, message: 'All fields are required' });
        }

        if (!['veg', 'non-veg', 'vegan'].includes(category)) {
            return res.json({ success: false, message: 'Invalid category' });
        }

        const menuItem = new menuModel({
            name,
            description,
            prepTime: parseInt(prepTime),
            category,
            price: parseFloat(price),
            isActive: isActive !== undefined ? !!isActive : true,
            image: image || '',
            restaurantId
        });

        await menuItem.save();
        const io = getIO();
        if (io) {
            io.to(`restaurant_menu_${restaurantId.toString()}`).emit('menu:itemAdded', menuItem);
        }
        return res.json({ success: true, message: 'Menu item added successfully', data: menuItem });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Get all menu items for a restaurant
export const getMenuItems = async (req, res) => {
    try {
        const restaurantId = req.user._id;
        const menuItems = await menuModel.find({ restaurantId }).sort({ createdAt: -1 });
        return res.json({ success: true, data: menuItems });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Update menu item
export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, prepTime, category, price, image, isActive } = req.body;
        const restaurantId = req.user._id;

        const menuItem = await menuModel.findOne({ _id: id, restaurantId });

        if (!menuItem) {
            return res.json({ success: false, message: 'Menu item not found' });
        }

        if (name) menuItem.name = name;
        if (description) menuItem.description = description;
        if (prepTime) menuItem.prepTime = parseInt(prepTime);
        if (category && ['veg', 'non-veg', 'vegan'].includes(category)) menuItem.category = category;
        if (price) menuItem.price = parseFloat(price);
        if (isActive !== undefined) menuItem.isActive = !!isActive;
        if (image !== undefined) menuItem.image = image;

        await menuItem.save();
        const io = getIO();
        if (io) {
            io.to(`restaurant_menu_${restaurantId.toString()}`).emit('menu:itemUpdated', menuItem);
        }
        return res.json({ success: true, message: 'Menu item updated successfully', data: menuItem });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Delete menu item
export const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user._id;

        const menuItem = await menuModel.findOneAndDelete({ _id: id, restaurantId });

        if (!menuItem) {
            return res.json({ success: false, message: 'Menu item not found' });
        }

        const io = getIO();
        if (io) {
            io.to(`restaurant_menu_${restaurantId.toString()}`).emit('menu:itemDeleted', { _id: id });
        }

        return res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Get single menu item
export const getMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user._id;

        const menuItem = await menuModel.findOne({ _id: id, restaurantId });

        if (!menuItem) {
            return res.json({ success: false, message: 'Menu item not found' });
        }

        return res.json({ success: true, data: menuItem });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Toggle menu item active/inactive status
export const toggleMenuItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const restaurantId = req.user._id;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isActive must be a boolean value' });
        }

        const menuItem = await menuModel.findOne({ _id: id, restaurantId });

        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        menuItem.isActive = isActive;
        await menuItem.save();

        const io = getIO();
        if (io) {
            io.to(`restaurant_menu_${restaurantId.toString()}`).emit('menu:itemUpdated', menuItem);
        }

        return res.json({
            success: true,
            message: `Menu item marked as ${isActive ? 'active' : 'inactive'}`,
            data: menuItem
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
