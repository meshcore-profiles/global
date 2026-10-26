const { Schema, model } = require('mongoose');

const NOTIFICATION_TYPES = ['verification'];
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const NotificationSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	type: { type: String, enum: NOTIFICATION_TYPES, required: true },
	data: { type: Schema.Types.Mixed, default: {} },
	readAt: Date,
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

NotificationSchema.index({ user: 1, readAt: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

module.exports = model('Notification', NotificationSchema);
