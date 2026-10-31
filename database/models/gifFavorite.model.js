const { Schema, model } = require('mongoose');

const GifFavoriteSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	gif: {
		slug: { type: String, required: true },
		title: { type: String, default: '' },
		url: { type: String, required: true },
		width: { type: Number, required: true },
		height: { type: Number, required: true },
	},
	preview: {
		url: String,
		width: Number,
		height: Number,
	},
	createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

GifFavoriteSchema.index({ user: 1, 'gif.slug': 1 }, { unique: true });
GifFavoriteSchema.index({ user: 1, createdAt: -1 });

module.exports = model('GifFavorite', GifFavoriteSchema);
