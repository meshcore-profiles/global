import { Schema, model } from 'mongoose';

// new: nobody from staff answered yet, open: staff owes the next step, pending: waiting for the requester, closed: done
const STATUSES = ['new', 'open', 'pending', 'closed'];
const ACTIVE_STATUSES = ['new', 'open'];

// A ticket is the card of a support conversation, the messages live in a Conversation (`ticket`) between the requester and the support desk.
// `content` holds ciphertext of { subject, email, fields } (see services/support/crypto.js), `email` is set only for tickets opened without an account.
const TicketSchema = new Schema({
	number: { type: Number, required: true },
	requester: { type: Schema.Types.ObjectId, ref: 'User' },
	topic: { type: String, required: true, maxlength: 40 },
	content: { type: String, required: true },
	status: { type: String, enum: STATUSES, default: 'new' },
	assignee: { type: Schema.Types.ObjectId, ref: 'User' },
	messageCount: { type: Number, default: 0, min: 0 },
	lastAt: { type: Date, default: Date.now },
	firstReplyAt: Date,
	closedAt: Date,
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

TicketSchema.index({ number: 1 }, { unique: true });
TicketSchema.index({ status: 1, lastAt: 1 });
TicketSchema.index({ requester: 1, lastAt: -1 });
TicketSchema.index({ assignee: 1, status: 1, lastAt: 1 });

export default model('Ticket', TicketSchema);

export { STATUSES, ACTIVE_STATUSES };
