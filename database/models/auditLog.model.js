const { Schema, model } = require('mongoose');

const AuditLogSchema = new Schema({
	// Missing for actions taken by the system itself, e.g. an expired ban
	actor: { type: Schema.Types.ObjectId, ref: 'User' },
	action: { type: String, required: true, maxlength: 40 },
	target: { type: Schema.Types.ObjectId, ref: 'User' },
	entity: { type: { _id: false, kind: String, id: String, name: { type: String, maxlength: 120 } }, default: undefined },
	reason: { type: String, maxlength: 500 },
	details: { type: String, maxlength: 200 },
}, { versionKey: false, timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ target: 1, createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = model('AuditLog', AuditLogSchema);
