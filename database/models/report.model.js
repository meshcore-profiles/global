const { Schema, model } = require('mongoose');
const { GifSchema, AttachmentSchema } = require('../schemas/messageContent.js');

const REASONS = ['dislike', 'spam', 'harassment', 'misinformation', 'privateInfo', 'illegal', 'other'];
const STATUSES = ['open', 'resolved', 'dismissed'];
const MAX_DETAILS_LENGTH = 500;

const ReportSchema = new Schema({
	reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	reported: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	message: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
	snapshot: {
		body: { type: String, default: '' },
		gif: { type: GifSchema, default: undefined },
		attachments: { type: [AttachmentSchema], default: undefined },
		poll: { type: { _id: false, question: String, options: [String] }, default: undefined },
		card: { type: { _id: false, kind: String, name: String, publicKey: String }, default: undefined },
		sentAt: { type: Date, required: true },
	},
	reason: { type: String, enum: REASONS, required: true },
	details: { type: String, maxlength: MAX_DETAILS_LENGTH },
	status: { type: String, enum: STATUSES, default: 'open' },
	reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
	reviewedAt: Date,
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

ReportSchema.index({ reporter: 1, message: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ message: 1 });
ReportSchema.index({ 'snapshot.attachments.id': 1 }, { sparse: true });

module.exports = model('Report', ReportSchema);
module.exports.REASONS = REASONS;
module.exports.STATUSES = STATUSES;
module.exports.MAX_DETAILS_LENGTH = MAX_DETAILS_LENGTH;
