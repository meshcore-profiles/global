const { Schema, model } = require('mongoose');

const NsfwSchema = new Schema({
	safe: { type: Number, default: null },
	suggestive: { type: Number, default: null },
	questionable: { type: Number, default: null },
	nsfw: { type: Number, default: null },
}, { _id: false });

const ColorsSchema = new Schema({
	dominant: { type: String, default: '' },
	palette: { type: [String], default: [] },
}, { _id: false });

const ImageScanSchema = new Schema({
	path: { type: String, required: true },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	nsfw: { type: NsfwSchema, default: null },
	colors: { type: ColorsSchema, default: null },
}, { timestamps: true, versionKey: false });

ImageScanSchema.index({ path: 1 }, { unique: true });
ImageScanSchema.index({ user: 1 });

module.exports = model('ImageScan', ImageScanSchema);
