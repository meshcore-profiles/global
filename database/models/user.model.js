const { Schema, model } = require('mongoose');
const ROLE = require('../../utils/roles.js');
const PROFILE_VISIBILITY = require('../../utils/profileVisibility.js');

const AUTH_METHODS = ['local', 'google', 'discord', 'github'];
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];
const DEVICE_KINDS = ['repeater', 'roomServer'];
const POWER_SOURCES = ['grid', 'solar', 'battery', 'poe', 'other'];
const PASSKEY_TRANSPORTS = ['usb', 'nfc', 'ble', 'internal', 'hybrid', 'smart-card'];
const PUBLIC_KEY_REGEX = /^[0-9a-f]{64}$/;
const MAX_NODE_PHOTOS = 5;
const MAX_BIO_IMAGES = 5;

const integer = {
	validator: Number.isInteger,
	message: '{PATH} must be an integer.',
};

const MAX_ITEMS = { companions: 20, devices: 50, contactEmails: 4, websites: 4, passkeys: 10 };

const maxItems = (max, what) => ({
	validator: v => v.length <= max,
	message: `Maximum ${max} ${what} allowed.`,
});

const maxPhotos = max => maxItems(max, 'photos');

const NsfwSchema = new Schema({
	safe: Number,
	suggestive: Number,
	questionable: Number,
	nsfw: Number,
}, { _id: false });

const ColorsSchema = new Schema({
	dominant: { type: String, lowercase: true, match: /^#[0-9a-f]{6}$/ },
	palette: [{ type: String, lowercase: true, match: /^#[0-9a-f]{6}$/ }],
}, { _id: false });

const ImageSchema = new Schema({
	path: { type: String, required: true, trim: true, match: /^\/[^\s?#]+$/ },
	width: { type: Number, required: true, min: 1 },
	height: { type: Number, required: true, min: 1 },
	nsfw: { type: NsfwSchema, default: undefined },
	colors: { type: ColorsSchema, default: undefined },
}, { _id: false });

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
	pathHash: { type: Number, enum: [1, 2, 3] },
	radio: {
		preset: { type: String, trim: true, maxlength: 30 },
		freq: { type: Number, min: 137, max: 2500 },
		bw: { type: Number, min: 7.8, max: 1625 },
		sf: { type: Number, min: 5, max: 12, validate: integer },
		cr: { type: Number, min: 5, max: 8, validate: integer },
	},
	antenna: {
		name: { type: String, trim: true, maxlength: 60 },
		gain: { type: Number, min: -10, max: 30 },
	},
	photos: { type: [ImageSchema], default: [], validate: maxPhotos(MAX_NODE_PHOTOS) },
	coverPosition: {
		x: { type: Number, min: 0, max: 100, default: 50 },
		y: { type: Number, min: 0, max: 100, default: 50 },
	},
	public: { type: Boolean, default: false },
	verification: verificationFields(),
};

const CompanionSchema = new Schema({
	...nodeFields,
	main: { type: Boolean, default: false },
	note: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

const DeviceSchema = new Schema({
	...nodeFields,
	kind: { type: String, enum: DEVICE_KINDS, required: true },
	location: {
		lat: { type: Number, min: -90, max: 90 },
		lon: { type: Number, min: -180, max: 180 },
	},
	note: { type: String, trim: true, maxlength: 500 },
	power: { type: String, trim: true, maxlength: 60 },
	txPower: { type: Number, min: -9, max: 30 },
	powerSource: { type: String, enum: POWER_SOURCES },
	solarPanel: { type: Number, min: 0.1, max: 500 },
	battery: { type: Number, min: 1, max: 200000 },
	antenna: {
		name: { type: String, trim: true, maxlength: 60 },
		type: { type: String, enum: ['omni', 'dir'] },
		heading: { type: Number, min: 0, max: 360 },
		gain: { type: Number, min: -10, max: 30 },
		height: { type: Number, min: 0, max: 600 },
	},
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

const WebsiteScanSchema = new Schema({
	at: { type: Date, required: true },
	ok: { type: Boolean, required: true },
	key: { type: String, trim: true },
	failures: { type: Number, default: 0, min: 0 },
}, { _id: false });

const WebsiteRevocationSchema = new Schema({
	at: { type: Date, required: true },
	key: { type: String, trim: true },
}, { _id: false });

const WebsiteSchema = new Schema({
	domain: { type: String, trim: true, maxlength: 253, required: true, lowercase: true },
	verified: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	method: { type: String, enum: ['dns', 'file'] },
	verificationToken: { type: String, trim: true },
	scan: { type: WebsiteScanSchema, default: undefined },
	revocation: { type: WebsiteRevocationSchema, default: undefined },
}, { timestamps: true });

const PasskeySchema = new Schema({
	credentialId: { type: String, required: true, trim: true, maxlength: 1024 },
	publicKey: { type: String, required: true, maxlength: 2048 },
	counter: { type: Number, default: 0, min: 0 },
	transports: { type: [{ type: String, enum: PASSKEY_TRANSPORTS }], default: [] },
	backedUp: { type: Boolean, default: false },
	userVerified: { type: Boolean, default: true },
	name: { type: String, trim: true, maxlength: 40, required: true },
	lastUsedAt: Date,
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
	language: { type: String, default: 'pl', trim: true, lowercase: true, match: /^[a-z]{2}$/ },
	roles: { type: [{ type: Number, enum: Object.values(ROLE) }], default: [ROLE.USER], required: true },
	banned: { type: Boolean, default: false },
	ban: {
		by: { type: Schema.Types.ObjectId, ref: 'User' },
		at: Date,
		reason: { type: String, maxlength: 500 },
		until: Date,
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
		visibility: { type: String, enum: Object.values(PROFILE_VISIBILITY), default: PROFILE_VISIBILITY.PUBLIC },
		avatar: { type: ImageSchema, default: undefined },
		banner: { type: ImageSchema, default: undefined },
		bannerPosition: {
			x: { type: Number, min: 0, max: 100, default: 50 },
			y: { type: Number, min: 0, max: 100, default: 50 },
		},
		bio: {
			value: { type: String, trim: true, maxlength: 4000 },
			public: { type: Boolean, default: false },
		},
		bioImages: { type: [ImageSchema], default: [], validate: maxPhotos(MAX_BIO_IMAGES) },
		discord: {
			id: { type: String, trim: true, match: /^\d{17,20}$/ },
			username: { type: String, trim: true, maxlength: 64 },
			displayName: { type: String, trim: true, maxlength: 64 },
			avatar: { type: String, trim: true, match: /^(a_)?[0-9a-f]{32}$/ },
			refreshToken: { type: String, select: false },
			syncedAt: Date,
		},
		networkSince: { type: Date },
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
		emailMessages: { type: Boolean, default: true },
		units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
	},
	stats: {
		views: { type: Number, default: 0, min: 0 },
		logins: { type: Number, default: 0, min: 0 },
		lastViewAt: { type: Date, default: null },
		lastSeenAt: { type: Date, default: null },
	},
	verification: verificationFields(),

	contactEmails: { type: [ContactEmailSchema], default: [], validate: maxItems(MAX_ITEMS.contactEmails, 'contact emails') },
	passkeys: { type: [PasskeySchema], default: [], validate: maxItems(MAX_ITEMS.passkeys, 'passkeys') },
	websites: { type: [WebsiteSchema], default: [], validate: maxItems(MAX_ITEMS.websites, 'websites') },
	companions: { type: [CompanionSchema], default: [], validate: maxItems(MAX_ITEMS.companions, 'companions') },
	devices: { type: [DeviceSchema], default: [], validate: maxItems(MAX_ITEMS.devices, 'devices') },
}, { versionKey: false, timestamps: true });

const partialUnique = field => [{ [field]: 1 }, { unique: true, partialFilterExpression: { [field]: { $type: 'string' } } }];

UserSchema.index(...partialUnique('slug'));
UserSchema.index(...partialUnique('auth.verificationCode'));
UserSchema.index(...partialUnique('auth.passwordReset.token'));
UserSchema.index({ 'auth.method': 1, 'auth.oauthId': 1 }, { unique: true, partialFilterExpression: { 'auth.oauthId': { $type: 'string' } } });
UserSchema.index({ 'profile.discord.id': 1 }, { unique: true, partialFilterExpression: { 'profile.discord.id': { $type: 'string' } } });
UserSchema.index(...partialUnique('companions.name'));
UserSchema.index(...partialUnique('companions.publicKey'));
UserSchema.index({ 'devices.publicKey': 1 });
UserSchema.index({ 'passkeys.credentialId': 1 }, { unique: true, partialFilterExpression: { 'passkeys.credentialId': { $type: 'string' } } });
UserSchema.index({ 'contactEmails.verificationToken': 1 }, { sparse: true });
UserSchema.index({ 'profile.onboarded': 1, 'profile.visibility': 1, banned: 1, createdAt: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'ban.until': 1 }, { partialFilterExpression: { banned: true } });
UserSchema.index({ 'verification.status': 1, 'profile.onboarded': 1 });
UserSchema.index({ 'companions.verification.status': 1 });
UserSchema.index({ 'devices.verification.status': 1 });

module.exports = model('User', UserSchema);
module.exports.MAX_ITEMS = MAX_ITEMS;
