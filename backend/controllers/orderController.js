import orderModel from '../models/orderModel.js';
import menuModel from '../models/menuModel.js';
import userModel from '../models/userModel.js';
import { getIO } from '../utils/socket.js';
import { createNotification } from '../utils/notifications.js';

const VALID_STATUSES = ['pending', 'accepted', 'cooking', 'preparing', 'ready', 'completed', 'cancelled', 'delayed'];

const TRACKING_STAGES = ['Order Created', 'Order Accepted', 'Cooking', 'Ready'];

const STATUS_STAGE_INDEX = {
    pending: 0,
    accepted: 1,
    cooking: 2,
    preparing: 2,
    delayed: 2,
    ready: 3,
    completed: 3,
    cancelled: -1
};

const isLikelyOrderCode = (value) => /^ORD-\d+$/i.test(value);

const buildTrackingResponse = (order) => {
    const now = Date.now();
    const normalizedStatus = order.status === 'preparing' ? 'cooking' : order.status;
    const timerStarted = ['accepted', 'cooking', 'delayed', 'ready', 'completed'].includes(normalizedStatus);
    const acceptedTimestamp = order.acceptedAt
        ? new Date(order.acceptedAt).getTime()
        : (timerStarted && order.updatedAt ? new Date(order.updatedAt).getTime() : null);
    const effectiveStartTimestamp = acceptedTimestamp || new Date(order.createdAt).getTime();
    const readyAt = effectiveStartTimestamp + (Number(order.estimatedTime) || 0) * 60 * 1000;
    const remainingSeconds = timerStarted
        ? Math.max(0, Math.ceil((readyAt - now) / 1000))
        : (Number(order.estimatedTime) || 0) * 60;

    return {
        _id: order._id,
        orderId: order.orderId,
        restaurantName: order.restaurantId?.restaurantName || 'Unknown Restaurant',
        placedAt: order.createdAt,
        totalAmount: order.totalAmount,
        estimatedTime: Number(order.estimatedTime) || 0,
        estimatedReadyAt: new Date(readyAt).toISOString(),
        remainingSeconds,
        timerStarted,
        status: normalizedStatus,
        timeline: {
            stages: TRACKING_STAGES,
            activeStageIndex: STATUS_STAGE_INDEX[normalizedStatus] ?? 0
        },
        items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            lineTotal: item.price * item.quantity
        })),
        isCancelled: normalizedStatus === 'cancelled',
        isDelayed: normalizedStatus === 'delayed',
        lastUpdatedAt: order.updatedAt
    };
};

const buildUpdateQuery = (user, id) => {
    if (user.role === 'admin') {
        return { _id: id };
    }
    return { _id: id, restaurantId: user._id };
};

// Generate unique order ID
const generateOrderId = async (restaurantId) => {
    const count = await orderModel.countDocuments({ restaurantId });
    return `ORD-${String(count + 1).padStart(4, '0')}`;
};

// Create preorder from a user (for a specific restaurant)
export const createUserPreorder = async (req, res) => {
    try {
        const { restaurantId, customerPhone, items } = req.body;

        if (!restaurantId) {
            return res.json({ success: false, message: 'Restaurant is required' });
        }

        if (!items || items.length === 0) {
            return res.json({ success: false, message: 'At least one item is required' });
        }

        const customerName = req.user?.name || 'Customer';

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
            customerId: req.user?._id,
            customerName,
            customerPhone: customerPhone || '',
            items: orderItems,
            totalAmount,
            estimatedTime: maxPrepTime,
            restaurantId
        });

        await order.save();

        await createNotification({
            recipientId: restaurantId,
            type: 'order-created',
            title: 'New order received',
            message: `${customerName} placed order ${orderId}`,
            meta: {
                route: '/restaurant/dashboard',
                orderId: String(order._id)
            }
        });

        const io = getIO();
        if (io) io.to(`order_${order._id.toString()}`).emit('orderUpdated', { orderId: order._id, data: order });
        return res.json({ success: true, message: 'Preorder created successfully', data: order });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
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
        const io = getIO();
        if (io) io.to(`order_${order._id.toString()}`).emit('orderUpdated', { orderId: order._id, data: order });
        return res.json({ success: true, message: 'Order created successfully', data: order });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Customer view for a single order (by _id or orderId)
export const getOrderForCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || (!id.match(/^[0-9a-fA-F]{24}$/) && !isLikelyOrderCode(id))) {
            return res.status(400).json({ success: false, message: 'Invalid order ID format' });
        }

        // Try by ObjectId first, then by orderId
        let order = null;
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            order = await orderModel.findById(id).populate('restaurantId', 'restaurantName phone');
        }

        if (!order) {
            order = await orderModel.findOne({ orderId: id }).populate('restaurantId', 'restaurantName phone');
        }

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Restrict visibility to authenticated customer only
        if (!order.customerId || !req.user || order.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied for this order' });
        }

        return res.json({ success: true, data: buildTrackingResponse(order) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get all orders for authenticated customer
export const getOrdersForCustomer = async (req, res) => {
    try {
        const customerId = req.user?._id;
        const orders = await orderModel
            .find({ customerId })
            .populate('restaurantId', 'restaurantName')
            .sort({ createdAt: -1 });

        const data = orders.map((order) => {
            const tracking = buildTrackingResponse(order);
            return {
                _id: tracking._id,
                orderId: tracking.orderId,
                restaurantName: tracking.restaurantName,
                placedAt: tracking.placedAt,
                totalAmount: tracking.totalAmount,
                estimatedTime: tracking.estimatedTime,
                remainingSeconds: tracking.remainingSeconds,
                timerStarted: tracking.timerStarted,
                status: tracking.status,
                isCancelled: tracking.isCancelled,
                isDelayed: tracking.isDelayed,
                itemCount: Array.isArray(order.items)
                    ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                    : 0
            };
        });

        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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
        const normalizedStatus = status === 'preparing' ? 'cooking' : status;

        if (!VALID_STATUSES.includes(normalizedStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await orderModel.findOne(buildUpdateQuery(req.user, id));

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.acceptedAt && ['accepted', 'cooking', 'preparing', 'delayed', 'ready', 'completed'].includes(normalizedStatus)) {
            order.acceptedAt = new Date();
        }

        order.status = normalizedStatus;
        await order.save();

        if (order.customerId) {
            await createNotification({
                recipientId: order.customerId,
                type: 'order-status',
                title: 'Order status updated',
                message: `Your order ${order.orderId} is now ${normalizedStatus}`,
                meta: {
                    route: `/order/track/${order._id}`,
                    orderId: String(order._id)
                }
            });
        }

        const io = getIO();
        if (io) io.to(`order_${order._id.toString()}`).emit('orderUpdated', { orderId: order._id, data: order });
        return res.json({ success: true, message: 'Order status updated', data: order });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update estimated time
export const updateEstimatedTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { estimatedTime } = req.body;
        const parsedEstimatedTime = Number(estimatedTime);

        if (!Number.isFinite(parsedEstimatedTime) || parsedEstimatedTime < 1) {
            return res.status(400).json({ success: false, message: 'Estimated time must be at least 1 minute' });
        }

        const order = await orderModel.findOne(buildUpdateQuery(req.user, id));

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.estimatedTime = parsedEstimatedTime;
        await order.save();
        const io = getIO();
        if (io) io.to(`order_${order._id.toString()}`).emit('orderUpdated', { orderId: order._id, data: order });
        return res.json({ success: true, message: 'Estimated time updated', data: order });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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

export const getRestaurantCustomerProfile = async (req, res) => {
    try {
        const { customerId } = req.params;
        const restaurantId = req.user._id;

        const customer = await userModel.findOne({ _id: customerId, role: 'user' }).select('name email');
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const orders = await orderModel
            .find({ restaurantId, customerId })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            data: {
                customer,
                orders
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
