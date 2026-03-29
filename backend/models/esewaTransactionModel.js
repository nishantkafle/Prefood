import mongoose from 'mongoose';

const esewaTransactionSchema = new mongoose.Schema({
  transactionUuid: { type: String, required: true, unique: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  amount: { type: Number, required: true },
  productCode: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
  timestamps: true
});

const esewaTransactionModel = mongoose.models.esewatransaction || mongoose.model('esewatransaction', esewaTransactionSchema);

export default esewaTransactionModel;
