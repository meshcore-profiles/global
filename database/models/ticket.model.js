import { Schema, model } from 'mongoose';

// new: nobody from staff answered yet, open: staff owes the next step, pending: waiting for the requester, closed: done
const STATUSES = ['new', 'open', 'pending', 'closed'];
const ACTIVE_STATUSES = ['new', 'open'];
// Priority is the index into this list, so it sorts numerically
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const DEFAULT_PRIORITY = 1;
const MAX_TAGS = 5;
const TAG_PATTERN = /^[a-z0-9ąćęłńóśźż][a-z0-9ąćęłńóśźż -]{0,22}[a-z0-9ąćęłńóśźż]$/;

// A ticket is the card of a support conversation, the messages live in a Conversation (`ticket`) between the requester and the support desk.
// `content` holds ciphertext of { subject, email, fields } (see services/support/crypto.js), `email` is set only for tickets opened without an account.
const TicketSchema = new Schema({
	number: { type: Number, required: true },
	requester: { type: Schema.Types.ObjectId, ref: 'User' },
	topic: { type: String, required: true, maxlength: 40 },
	content: { type: String, required: true },
	status: { type: String, enum: STATUSES, default: 'new' },
	assignee: { type: Schema.Types.ObjectId, ref: 'User' },
	priority: { type: Number, min: 0, max: PRIORITIES.length - 1, default: DEFAULT_PRIORITY },
	tags: { type: [String], validate: { validator: tags => tags.length <= MAX_TAGS && tags.every(tag => TAG_PATTERN.test(tag)), message: 'Invalid ticket tags' } },
	rating: { type: Number, min: 1, max: 5 },
	ratedAt: Date,
	autoClosed: Boolean,
	messageCount: { type: Number, default: 0, min: 0 },
	lastAt: { type: Date, default: Date.now },
	firstReplyAt: Date,
	closedAt: Date,
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

TicketSchema.index({ number: 1 }, { unique: true });
TicketSchema.index({ status: 1, lastAt: 1 });
TicketSchema.index({ requester: 1, lastAt: -1 });
TicketSchema.index({ assignee: 1, status: 1, lastAt: 1 });
TicketSchema.index({ tags: 1 });

export default model('Ticket', TicketSchema);

export { STATUSES, ACTIVE_STATUSES, PRIORITIES, DEFAULT_PRIORITY, MAX_TAGS, TAG_PATTERN };
