import { Schema, model } from 'mongoose';

const PlatformFileSchema = new Schema({
	filename: { type: String, default: '' },
	url: { type: String, default: '' },
	size: { type: Number, default: 0 },
	sha256: { type: String, default: '' },
}, { _id: false });

const MeshCoreVersionSchema = new Schema({
	version: { type: String, default: '' },
	build: { type: String, default: '' },
	commit: { type: String, default: '' },
	releasedAt: { type: Date, default: Date.now },
	checkedAt: { type: Date, default: Date.now },
	platforms: {
		windows: { type: PlatformFileSchema, default: () => ({}) },
		linux: { type: PlatformFileSchema, default: () => ({}) },
		linuxAppImage: { type: PlatformFileSchema, default: () => ({}) },
		macos: { type: PlatformFileSchema, default: () => ({}) },
	},
}, { versionKey: false });

export default model('MeshCoreVersion', MeshCoreVersionSchema, 'meshcore_versions');
