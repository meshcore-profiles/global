const { Schema, model } = require('mongoose');

const ConversationSchema = new Schema({
	owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	peer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	last: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
	lastAt: { type: Date, required: true },
	unread: { type: Number, default: 0, min: 0 },
	muted: { type: Boolean, default: false },
	hidden: { type: Boolean, default: false },
	clearedAt: Date,
}, { versionKey: false });

ConversationSchema.index({ owner: 1, peer: 1 }, { unique: true });
ConversationSchema.index({ owner: 1, lastAt: -1 });

module.exports = model('Conversation', ConversationSchema);
