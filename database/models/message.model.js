const { Schema, model } = require('mongoose');

const MAX_MESSAGE_LENGTH = 2000;

const MessageSchema = new Schema({
	from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	body: { type: String, trim: true, required: true, maxlength: MAX_MESSAGE_LENGTH },
	clientId: String,
	readAt: Date,
	editedAt: Date,
	replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
	reactions: {
		type: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, emoji: { type: String, required: true } }],
		default: undefined,
	},
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

MessageSchema.index({ to: 1, readAt: 1 });
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ to: 1, from: 1, createdAt: -1 });
MessageSchema.index({ from: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

module.exports = model('Message', MessageSchema);
module.exports.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
