import crypto from 'crypto';
import { randomUUID } from 'crypto';
import menuModel from '../models/menuModel.js';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import esewaTransactionModel from '../models/esewaTransactionModel.js';
import { getIO } from '../utils/socket.js';
import { createNotification } from '../utils/notifications.js';

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_CHECKOUT_URL = process.env.ESEWA_CHECKOUT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_VERIFY_STATUS_URL = process.env.ESEWA_VERIFY_STATUS_URL || '';
const BACKEND_BASE_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const SIGNED_FIELD_NAMES = 'total_amount,transaction_uuid,product_code';
const MAX_SCHEDULE_DAYS = 7;
const MAX_SCHEDULE_MS = MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000;

const buildSignature = (totalAmount, transactionUuid, productCode) => {
  const signingString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(signingString).digest('base64');
};

const parseClockToMinutes = (timeString = '') => {
  if (typeof timeString !== 'string') return null;
  const match = timeString.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return (hours * 60) + minutes;
};

const getRestaurantOperatingState = (restaurant, now = new Date()) => {
  const openingMinutes = parseClockToMinutes(restaurant?.openingTime);
  const closingMinutes = parseClockToMinutes(restaurant?.closingTime);

  if (openingMinutes === null || closingMinutes === null) {
    return { isConfigured: false, isOpen: true };
  }

  const nowMinutes = (now.getHours() * 60) + now.getMinutes();

  if (openingMinutes === closingMinutes) {
    return { isConfigured: true, isOpen: true };
  }

  if (openingMinutes < closingMinutes) {
    return {
      isConfigured: true,
      isOpen: nowMinutes >= openingMinutes && nowMinutes < closingMinutes
    };
  }

  return {
    isConfigured: true,
    isOpen: nowMinutes >= openingMinutes || nowMinutes < closingMinutes
  };
};

const generateOrderId = async (restaurantId) => {
  const count = await orderModel.countDocuments({ restaurantId });
  return `ORD-${String(count + 1).padStart(4, '0')}`;
};

const createOrderFromDraft = async (transaction) => {
  const draft = transaction?.orderDraft;
  if (!draft?.restaurantId || !Array.isArray(draft?.items) || draft.items.length === 0) {
    return null;
  }

  const orderId = await generateOrderId(draft.restaurantId);

  const order = await orderModel.create({
    orderId,
    customerId: draft.customerId,
    customerName: draft.customerName,
    customerPhone: draft.customerPhone || '',
    dineInAt: draft.dineInAt,
    items: draft.items,
    totalAmount: draft.totalAmount,
    estimatedTime: draft.estimatedTime,
    restaurantId: draft.restaurantId,
    paymentMethod: 'esewa',
    paymentStatus: 'completed',
    paymentTransactionUuid: transaction.transactionUuid
  });

  await createNotification({
    recipientId: draft.restaurantId,
    type: 'order-created',
    title: 'New order received',
    message: `${draft.customerName || 'Customer'} placed order ${orderId} for ${new Date(draft.dineInAt).toLocaleString()}`,
    meta: {
      route: '/restaurant/dashboard',
      orderId: String(order._id)
    }
  });

  const io = getIO();
  if (io) {
    io.to(`restaurant_orders_${draft.restaurantId}`).emit('order:new', order);
    if (draft.customerId) {
      io.to(`user_${String(draft.customerId)}`).emit('order:new', order);
    }
  }

  return order;
};

const updateFailedTransaction = async (transactionUuid, gatewayResponse = null) => {
  if (!transactionUuid) return;

  const transaction = await esewaTransactionModel.findOne({ transactionUuid });
  if (!transaction) return;

  transaction.status = 'failed';
  transaction.gatewayResponse = gatewayResponse;
  await transaction.save();
};

const extractTransactionUuidFromFailureQuery = (query) => {
  if (query?.transaction_uuid) return query.transaction_uuid;
  if (!query?.data) return '';

  try {
    const decodedString = Buffer.from(query.data, 'base64').toString('utf-8');
    const decodedData = JSON.parse(decodedString);
    return decodedData?.transaction_uuid || '';
  } catch (error) {
    return '';
  }
};

const parseEsewaEncodedPayload = (encodedData) => {
  if (!encodedData) return null;

  try {
    const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
    return JSON.parse(decodedString);
  } catch (error) {
    return null;
  }
};

const verifyEsewaTransactionIfEnabled = async (decodedData) => {
  if (!ESEWA_VERIFY_STATUS_URL) {
    return { verified: true, skipped: true };
  }

  const params = new URLSearchParams({
    product_code: decodedData?.product_code || '',
    total_amount: String(decodedData?.total_amount || ''),
    transaction_uuid: decodedData?.transaction_uuid || ''
  });

  if (decodedData?.transaction_code) {
    params.set('transaction_code', decodedData.transaction_code);
  }

  try {
    const response = await fetch(`${ESEWA_VERIFY_STATUS_URL}?${params.toString()}`);
    if (!response.ok) {
      return { verified: false, skipped: false };
    }

    const verificationData = await response.json();
    const status = String(verificationData?.status || '').toUpperCase();
    return { verified: status === 'COMPLETE' || status === 'SUCCESS', skipped: false };
  } catch (error) {
    return { verified: false, skipped: false };
  }
};

const completeTransactionByDecodedData = async (decodedData) => {
  const transactionUuid = decodedData?.transaction_uuid;
  if (!transactionUuid) {
    return { ok: false, reason: 'transaction_not_found' };
  }

  if (decodedData?.status !== 'COMPLETE') {
    await updateFailedTransaction(transactionUuid, decodedData);
    return { ok: false, reason: 'not_complete' };
  }

  const transaction = await esewaTransactionModel.findOne({ transactionUuid });
  if (!transaction) {
    return { ok: false, reason: 'transaction_not_found' };
  }

  const callbackTotalAmount = Number(decodedData?.total_amount);
  if (!Number.isFinite(callbackTotalAmount) || Number(transaction.amount) !== callbackTotalAmount) {
    await updateFailedTransaction(transactionUuid, decodedData);
    return { ok: false, reason: 'amount_mismatch' };
  }

  if (decodedData?.product_code !== transaction.productCode) {
    await updateFailedTransaction(transactionUuid, decodedData);
    return { ok: false, reason: 'product_mismatch' };
  }

  const verificationResult = await verifyEsewaTransactionIfEnabled(decodedData);
  if (!verificationResult.verified) {
    await updateFailedTransaction(transactionUuid, decodedData);
    return { ok: false, reason: 'verification_failed' };
  }

  let orderId = transaction.orderId ? String(transaction.orderId) : '';

  if (!orderId) {
    const createdOrder = await createOrderFromDraft(transaction);
    if (!createdOrder) {
      await updateFailedTransaction(transactionUuid, decodedData);
      return { ok: false, reason: 'order_draft_invalid' };
    }

    orderId = String(createdOrder._id);
    transaction.orderId = createdOrder._id;
  }

  if (transaction.status !== 'completed') {
    transaction.status = 'completed';
    transaction.gatewayResponse = decodedData;
    await transaction.save();
  } else if (!transaction.gatewayResponse) {
    transaction.gatewayResponse = decodedData;
    await transaction.save();
  }

  return {
    ok: true,
    reason: 'success',
    transactionUuid,
    orderId
  };
};

export const initiateEsewaPayment = async (req, res) => {
  try {
    const { restaurantId, customerPhone, items, dineInAt } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const restaurant = await userModel
      .findOne({ _id: restaurantId, role: 'restaurant' })
      .select('openingTime closingTime');

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const operatingState = getRestaurantOperatingState(restaurant);
    if (operatingState.isConfigured && !operatingState.isOpen) {
      return res.status(400).json({
        success: false,
        message: `Restaurant is currently closed. Opening time: ${restaurant.openingTime}. Closing time: ${restaurant.closingTime}.`
      });
    }

    if (!dineInAt) {
      return res.status(400).json({ success: false, message: 'Please select your dine-in arrival time' });
    }

    const parsedDineInAt = new Date(dineInAt);
    if (Number.isNaN(parsedDineInAt.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid dine-in arrival time' });
    }

    if (parsedDineInAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Dine-in arrival time cannot be in the past' });
    }

    if (parsedDineInAt.getTime() > Date.now() + MAX_SCHEDULE_MS) {
      return res.status(400).json({
        success: false,
        message: `Dine-in arrival time can only be scheduled up to ${MAX_SCHEDULE_DAYS} days ahead`
      });
    }

    const customerName = req.user?.name || 'Customer';

    const menuItemIds = items.map((item) => item.menuItem);
    const menuItems = await menuModel.find({ _id: { $in: menuItemIds }, restaurantId });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({ success: false, message: 'One or more menu items not found' });
    }

    const inactiveItems = menuItems.filter((menu) => menu.isActive === false);
    if (inactiveItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${inactiveItems[0].name} is out of stock`
      });
    }

    const menuMap = {};
    menuItems.forEach((menu) => {
      menuMap[menu._id.toString()] = menu;
    });

    let totalAmount = 0;
    let maxPrepTime = 0;

    const orderItems = items.map((item) => {
      const menu = menuMap[item.menuItem];
      const quantity = parseInt(item.quantity, 10) || 1;
      const itemTotal = menu.price * quantity;
      totalAmount += itemTotal;
      if (menu.prepTime > maxPrepTime) maxPrepTime = menu.prepTime;

      return {
        menuItem: menu._id,
        name: menu.name,
        quantity,
        price: menu.price,
        prepTime: menu.prepTime
      };
    });

    const orderDraft = {
      customerId: req.user?._id,
      customerName,
      customerPhone: customerPhone || '',
      dineInAt: parsedDineInAt,
      items: orderItems,
      totalAmount,
      estimatedTime: maxPrepTime,
      restaurantId,
      paymentMethod: 'esewa',
      paymentStatus: 'pending'
    };

    const transactionUuid = randomUUID();
    const formattedTotalAmount = Number(totalAmount).toFixed(2);
    const signature = buildSignature(formattedTotalAmount, transactionUuid, ESEWA_PRODUCT_CODE);

    await esewaTransactionModel.create({
      transactionUuid,
      userId: req.user._id,
      amount: Number(formattedTotalAmount),
      productCode: ESEWA_PRODUCT_CODE,
      orderDraft,
      status: 'pending'
    });

    const payload = {
      amount: formattedTotalAmount,
      tax_amount: '0',
      total_amount: formattedTotalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${BACKEND_BASE_URL}/api/esewa/success`,
      failure_url: `${BACKEND_BASE_URL}/api/esewa/failure`,
      signed_field_names: SIGNED_FIELD_NAMES,
      signature
    };

    return res.json({
      success: true,
      checkoutUrl: ESEWA_CHECKOUT_URL,
      payload,
      transaction_uuid: transactionUuid
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const handleEsewaSuccess = async (req, res) => {
  try {
    const encodedData = req.query.data;

    if (!encodedData) {
      return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure&reason=missing_data`);
    }

    const decodedData = parseEsewaEncodedPayload(encodedData);
    if (!decodedData) {
      return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure&reason=invalid_data`);
    }

    const completionResult = await completeTransactionByDecodedData(decodedData);
    if (!completionResult.ok) {
      return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure&reason=${completionResult.reason}`);
    }

    return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=success&orderId=${completionResult.orderId}&transaction_uuid=${completionResult.transactionUuid}`);
  } catch (error) {
    return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure&reason=server_error`);
  }
};

export const handleEsewaFailure = async (req, res) => {
  try {
    const transactionUuid = extractTransactionUuidFromFailureQuery(req.query);
    await updateFailedTransaction(transactionUuid, req.query);
    return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure`);
  } catch (error) {
    return res.redirect(`${FRONTEND_BASE_URL}/payment-success?status=failure&reason=server_error`);
  }
};

export const handleEsewaIPN = async (req, res) => {
  try {
    const encodedData = req.body?.data || req.query?.data || '';
    const decodedData = parseEsewaEncodedPayload(encodedData);

    if (!decodedData) {
      return res.status(400).json({ success: false, message: 'Invalid IPN payload' });
    }

    const completionResult = await completeTransactionByDecodedData(decodedData);
    if (!completionResult.ok) {
      return res.status(400).json({ success: false, message: completionResult.reason });
    }

    return res.json({ success: true, message: 'IPN processed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'IPN processing failed' });
  }
};
