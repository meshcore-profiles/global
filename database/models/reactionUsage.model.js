const { Schema, model } = require('mongoose');

const ReactionUsageSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	emoji: { type: String, required: true },
	count: { type: Number, default: 0 },
	lastUsedAt: { type: Date, default: Date.now },
}, { versionKey: false });

ReactionUsageSchema.index({ user: 1, emoji: 1 }, { unique: true });
ReactionUsageSchema.index({ user: 1, count: -1, lastUsedAt: -1 });

module.exports = model('ReactionUsage', ReactionUsageSchema);
