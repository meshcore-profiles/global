import { Schema, model } from 'mongoose';

const NOTE_KINDS = ['note', 'warning'];
const MAX_NOTE_LENGTH = 1000;

const UserNoteSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	kind: { type: String, enum: NOTE_KINDS, default: 'note' },
	text: { type: String, trim: true, required: true, maxlength: MAX_NOTE_LENGTH },
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

UserNoteSchema.index({ user: 1, createdAt: -1 });

export default model('UserNote', UserNoteSchema);

export { NOTE_KINDS, MAX_NOTE_LENGTH };
