import mongoose from 'mongoose';

const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
  timestamps: true
});

const siteSettingModel = mongoose.models.sitesetting || mongoose.model('sitesetting', siteSettingSchema);

export default siteSettingModel;
