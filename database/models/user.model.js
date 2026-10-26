const { Schema, model } = require('mongoose');
const { roles } = require('../../../utils/roles.js');

const AUTH_METHODS = ['local', 'google', 'discord', 'github'];
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];
const DEVICE_KINDS = ['repeater', 'roomServer'];
const PUBLIC_KEY_REGEX = /^[0-9a-f]{64}$/;
const ANTENNA_TYPES = ['', 'omni', 'dir'];
const MAX_DEVICE_PHOTOS = 5;
const MAX_COMPANION_PHOTOS = 1;

const maxPhotos = max => ({
	validator: v => v.length <= max,
	message: `Maximum ${max} photos allowed.`,
});

const verificationFields = () => ({
	status: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
	reason: { type: String, trim: true, maxlength: 500 },
	reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
	reviewedAt: Date,
});

const nodeFields = {
	name: { type: String, trim: true, maxlength: 60, required: true },
	publicKey: { type: String, required: true, trim: true, lowercase: true, match: PUBLIC_KEY_REGEX },
	model: { type: String, trim: true, maxlength: 60 },
	radio: {
		preset: { type: String, trim: true, maxlength: 30 },
		freq: { type: String, trim: true, maxlength: 30 },
		bw: { type: String, trim: true, maxlength: 30 },
		sf: { type: String, trim: true, maxlength: 30 },
		cr: { type: String, trim: true, maxlength: 30 },
	},
	antenna: {
		name: { type: String, trim: true, maxlength: 60 },
	},
	photos: { type: [String], default: [] },
	public: { type: Boolean, default: false },
	verification: verificationFields(),
};

const CompanionSchema = new Schema({
	...nodeFields,
	main: { type: Boolean, default: false },
	photos: { ...nodeFields.photos, validate: maxPhotos(MAX_COMPANION_PHOTOS) },
}, { timestamps: true });

const DeviceSchema = new Schema({
	...nodeFields,
	kind: { type: String, enum: DEVICE_KINDS, required: true },
	note: { type: String, trim: true, maxlength: 500 },
	power: { type: String, trim: true, maxlength: 60 },
	antenna: {
		name: { type: String, trim: true, maxlength: 60 },
		type: { type: String, enum: ANTENNA_TYPES, default: '' },
		heading: { type: String, trim: true, maxlength: 30 },
		gain: { type: String, trim: true, maxlength: 30 },
		height: { type: String, trim: true, maxlength: 30 },
	},
	photos: { ...nodeFields.photos, validate: maxPhotos(MAX_DEVICE_PHOTOS) },
}, { timestamps: true });

const ContactEmailSchema = new Schema({
	address: { type: String, trim: true, maxlength: 320, required: true, lowercase: true },
	verified: { type: Boolean, default: false },
	primary: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	verificationToken: { type: String, trim: true },
	verificationExpires: Date,
	verificationSentAt: Date,
}, { timestamps: true });

const WebsiteSchema = new Schema({
	domain: { type: String, trim: true, maxlength: 253, required: true, lowercase: true },
	verified: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	method: { type: String, enum: ['dns', 'file'] },
	verificationToken: { type: String, trim: true },
}, { timestamps: true });

const UserSchema = new Schema({
	username: { type: String, trim: true, maxlength: 25, required: true, unique: true, minlength: 3 },
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
	},
	slug: { type: String, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
	language: { type: String, default: 'pl' },
	roles: { type: [{ type: Number, enum: Object.keys(roles).map(Number) }], default: [1], required: true },
	banned: { type: Boolean, default: false },
	ban: {
		by: { type: Schema.Types.ObjectId, ref: 'User' },
		at: Date,
	},

	auth: {
		method: { type: String, enum: AUTH_METHODS, required: true, default: 'local' },
		oauthId: { type: String, default: undefined },
		passwordHash: {
			type: String,
			required() {
				return this.auth.method === 'local';
			},
			select: false,
		},
		activated: { type: Boolean, default: false },
		verificationExpires: Date,
		verificationCode: {
			type: String,
			default: undefined,
			validate: {
				validator(v) {
					return this.auth.activated || (typeof v === 'string' && v.length > 0);
				},
				message: 'Verification code is required before account activation',
			},
		},
		passwordReset: {
			token: { type: String, default: undefined },
			expires: { type: Date, default: undefined },
		},
	},

	profile: {
		onboarded: { type: Boolean, default: false },
		hidden: { type: Boolean, default: false },
		avatar: { type: String, trim: true, default: '' },
		banner: { type: String, trim: true, default: '' },
		bannerPosition: {
			x: { type: Number, min: 0, max: 100, default: 50 },
			y: { type: Number, min: 0, max: 100, default: 50 },
		},
		bio: {
			value: { type: String, trim: true, maxlength: 1000 },
			public: { type: Boolean, default: false },
		},
		discord: { type: String, trim: true, maxlength: 60 },
		region: { type: String, trim: true, maxlength: 120 },
		location: {
			countryIso2: { type: String, trim: true, maxlength: 2 },
			countryName: { type: String, trim: true, maxlength: 120 },
			stateId: { type: String, trim: true, maxlength: 20 },
			stateName: { type: String, trim: true, maxlength: 120 },
			city: { type: String, trim: true, maxlength: 120 },
		},
	},
	settings: {
		allowMessages: { type: Boolean, default: true },
		showPresence: { type: Boolean, default: true },
	},
	stats: {
		views: { type: Number, default: 0 },
		lastViewAt: { type: Date, default: null },
		lastSeenAt: { type: Date, default: null },
	},
	verification: verificationFields(),

	contactEmails: { type: [ContactEmailSchema], default: [] },
	websites: { type: [WebsiteSchema], default: [] },
	companions: { type: [CompanionSchema], default: [] },
	devices: { type: [DeviceSchema], default: [] },
}, { versionKey: false, timestamps: true });

const partialUnique = field => [{ [field]: 1 }, { unique: true, partialFilterExpression: { [field]: { $exists: true } } }];

UserSchema.index(...partialUnique('slug'));
UserSchema.index(...partialUnique('auth.verificationCode'));
UserSchema.index(...partialUnique('auth.passwordReset.token'));
UserSchema.index({ 'auth.method': 1, 'auth.oauthId': 1 }, { unique: true, partialFilterExpression: { 'auth.oauthId': { $exists: true } } });
UserSchema.index(...partialUnique('companions.name'));
UserSchema.index(...partialUnique('companions.publicKey'));
UserSchema.index({ 'devices.publicKey': 1 });
UserSchema.index({ 'contactEmails.verificationToken': 1 }, { sparse: true });
UserSchema.index({ 'profile.onboarded': 1, 'profile.hidden': 1, banned: 1, createdAt: -1 });
UserSchema.index({ 'verification.status': 1, 'profile.onboarded': 1 });
UserSchema.index({ 'companions.verification.status': 1 });
UserSchema.index({ 'devices.verification.status': 1 });

module.exports = model('User', UserSchema);
