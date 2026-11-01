const { Schema, model } = require('mongoose');

// Per-user state of one conversation. Both participants live in the same document, so unread/muted/hidden stay independent for each of them.
const MemberSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	unread: { type: Number, default: 0, min: 0 },
	muted: { type: Boolean, default: false },
	hidden: { type: Boolean, default: false },
	clearedAt: Date,
}, { _id: false });

const ConversationSchema = new Schema({
	key: { type: String, required: true },
	members: { type: [MemberSchema], validate: { validator: members => members.length === 2 && String(members[0].user) !== String(members[1].user), message: 'A conversation has exactly two different members' } },
	last: { type: Schema.Types.ObjectId, ref: 'Message' },
	lastAt: Date,
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

ConversationSchema.index({ key: 1 }, { unique: true });
ConversationSchema.index({ 'members.user': 1, lastAt: -1, _id: -1 });

// The same key for both directions, so a pair of users can never end up with two conversations
const pairKey = (a, b) => [String(a), String(b)].sort().join(':');

module.exports = model('Conversation', ConversationSchema);
module.exports.pairKey = pairKey;
