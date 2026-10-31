const { Schema, model } = require('mongoose');
const { GifSchema, AttachmentSchema, CardSchema } = require('../schemas/messageContent.js');

const MAX_MESSAGE_LENGTH = 2000;

const hasContent = doc => !!(doc.gif || doc.poll || doc.card || doc.attachments?.length);

const MessageSchema = new Schema({
	from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	body: { type: String, trim: true, required: function () { return !hasContent(this); }, default: '', maxlength: MAX_MESSAGE_LENGTH },
	clientId: String,
	gif: { type: GifSchema, default: undefined },
	readAt: Date,
	editedAt: Date,
	replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
	attachments: { type: [AttachmentSchema], default: undefined },
	card: { type: CardSchema, default: undefined },
	poll: {
		type: {
			_id: false,
			question: { type: String, maxlength: 200 },
			multi: Boolean,
			endsAt: Date,
			options: [{ _id: false, id: Number, text: { type: String, maxlength: 80 }, emoji: { type: String, maxlength: 32 }, votes: [{ type: Schema.Types.ObjectId, ref: 'User' }] }],
		},
		default: undefined,
	},
	reactions: {
		type: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, emoji: { type: String, required: true } }],
		default: undefined,
	},
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

MessageSchema.index({ from: 1, to: 1, _id: -1 });
MessageSchema.index({ to: 1, from: 1, _id: -1 });
MessageSchema.index({ to: 1, readAt: 1 });
MessageSchema.index({ from: 1, createdAt: -1 });
MessageSchema.index({ 'attachments.id': 1 }, { sparse: true });
MessageSchema.index({ from: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

module.exports = model('Message', MessageSchema);
module.exports.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
