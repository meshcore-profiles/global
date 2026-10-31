const { Schema } = require('mongoose');

const GifSchema = new Schema({
	slug: { type: String, maxlength: 100 },
	title: { type: String, maxlength: 100 },
	url: { type: String, maxlength: 500 },
	width: Number,
	height: Number,
}, { _id: false });

const AttachmentSchema = new Schema({
	id: { type: String, required: true },
	name: { type: String, maxlength: 120 },
	mime: { type: String, maxlength: 100 },
	size: Number,
	previewSize: Number,
	kind: { type: String, enum: ['image', 'file', 'voice'], required: true },
	width: Number,
	height: Number,
	duration: Number,
	spoiler: Boolean,
}, { _id: false });

const CARD_TYPES = ['companion', 'repeater', 'roomServer'];

const CardSchema = new Schema({
	type: { type: String, enum: CARD_TYPES, required: true },
	nodeId: { type: String, required: true, maxlength: 24 },
	name: { type: String, maxlength: 60 },
	publicKey: { type: String, maxlength: 64 },
	model: { type: String, maxlength: 60 },
	preset: { type: String, maxlength: 30 },
	freq: { type: String, maxlength: 30 },
	photo: { type: String, maxlength: 500 },
	linkable: Boolean,
}, { _id: false });

module.exports = { GifSchema, AttachmentSchema, CardSchema, CARD_TYPES };
