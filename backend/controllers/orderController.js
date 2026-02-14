import orderModel from '../models/orderModel.js';
import menuModel from '../models/menuModel.js';

// Generate unique order ID
const generateOrderId = async (restaurantId) => {
    const count = await orderModel.countDocuments({ restaurantId });
    return `ORD-${String(count + 1).padStart(4, '0')}`;
};

// Create new order
export const createOrder = async (req, res) => {
    try {
        const { customerName, customerPhone, items } = req.body;
        const restaurantId = req.user._id;

        if (!customerName || !items || items.length === 0) {
            return res.json({ success: false, message: 'Customer name and at least one item are required' });
        }

        // Fetch menu items to get current prices and prep times
        const menuItemIds = items.map(i => i.menuItem);
        const menuItems = await menuModel.find({ _id: { $in: menuItemIds }, restaurantId });

        if (menuItems.length !== menuItemIds.length) {
            return res.json({ success: false, message: 'One or more menu items not found' });
        }

        const menuMap = {};
        menuItems.forEach(m => { menuMap[m._id.toString()] = m; });

        let totalAmount = 0;
        let maxPrepTime = 0;

        const orderItems = items.map(item => {
            const menu = menuMap[item.menuItem];
            const qty = parseInt(item.quantity) || 1;
            const itemTotal = menu.price * qty;
            totalAmount += itemTotal;
            if (menu.prepTime > maxPrepTime) maxPrepTime = menu.prepTime;
            return {
                menuItem: menu._id,
                name: menu.name,
                quantity: qty,
                price: menu.price,
                prepTime: menu.prepTime
            };
        });

        const orderId = await generateOrderId(restaurantId);

        const order = new orderModel({
            orderId,
            customerName,
            customerPhone: customerPhone || '',
            items: orderItems,
            totalAmount,
            estimatedTime: maxPrepTime,
            restaurantId
        });

        await order.save();
        return res.json({ success: true, message: 'Order created successfully', data: order });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Get all orders for a restaurant
export const getOrders = async (req, res) => {
    try {
        const restaurantId = req.user._id;
        const orders = await orderModel.find({ restaurantId }).sort({ createdAt: -1 });
        return res.json({ success: true, data: orders });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const restaurantId = req.user._id;

        if (!['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
            return res.json({ success: false, message: 'Invalid status' });
        }

        const order = await orderModel.findOne({ _id: id, restaurantId });

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        await order.save();
        return res.json({ success: true, message: 'Order status updated', data: order });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Update estimated time
export const updateEstimatedTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { estimatedTime } = req.body;
        const restaurantId = req.user._id;

        if (!estimatedTime || estimatedTime < 1) {
            return res.json({ success: false, message: 'Estimated time must be at least 1 minute' });
        }

        const order = await orderModel.findOne({ _id: id, restaurantId });

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        order.estimatedTime = estimatedTime;
        await order.save();
        return res.json({ success: true, message: 'Estimated time updated', data: order });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Delete order
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user._id;

        const order = await orderModel.findOneAndDelete({ _id: id, restaurantId });

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        return res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
