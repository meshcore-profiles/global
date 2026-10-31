const { Schema, model } = require('mongoose');

const BlockSchema = new Schema({
	owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	target: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

BlockSchema.index({ owner: 1, target: 1 }, { unique: true });
BlockSchema.index({ target: 1, owner: 1 });

module.exports = model('Block', BlockSchema);
