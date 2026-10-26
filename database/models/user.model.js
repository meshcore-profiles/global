const { Schema, model } = require('mongoose');
const { roles } = require('../../../utils/roles.js');

const AUTH_METHODS = ['local', 'google', 'discord', 'github'];
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];
const DEVICE_KINDS = ['repeater', 'roomServer'];
const PUBLIC_KEY_REGEX = /^[0-9a-f]{64}$/;
const MAX_DEVICE_PHOTOS = 5;

const text = (maxlength, options = {}) => ({ type: String, trim: true, ...(maxlength && { maxlength }), ...options });

const nodeFields = {
	name: text(60, { required: true }),
	publicKey: { type: String, required: true, trim: true, lowercase: true, match: PUBLIC_KEY_REGEX },
	model: text(60),
	preset: text(30),
	freq: text(30),
	bw: text(30),
	sf: text(30),
	cr: text(30),
	antenna: text(60),
	photos: { type: [String], default: [] },
	public: { type: Boolean, default: false },
	verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
	verificationReason: text(500),
};

const CompanionSchema = new Schema({
	...nodeFields,
	main: { type: Boolean, default: false },
}, { timestamps: true });

const DeviceSchema = new Schema({
	...nodeFields,
	kind: { type: String, enum: DEVICE_KINDS, required: true },
	note: text(500),
	antennaType: text(60),
	heading: text(30),
	gain: text(30),
	height: text(30),
	power: text(60),
	photos: {
		...nodeFields.photos,
		validate: { validator: v => v.length <= MAX_DEVICE_PHOTOS, message: `Maximum ${MAX_DEVICE_PHOTOS} photos per device.` },
	},
}, { timestamps: true });

const ContactEmailSchema = new Schema({
	address: text(320, { required: true, lowercase: true }),
	verified: { type: Boolean, default: false },
	primary: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	verificationToken: text(),
	verificationExpires: Date,
	verificationSentAt: Date,
}, { timestamps: true });

const WebsiteSchema = new Schema({
	domain: text(253, { required: true, lowercase: true }),
	verified: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	method: { type: String, enum: ['dns', 'file'] },
	verificationToken: text(),
}, { timestamps: true });

const UserSchema = new Schema({
	username: text(25, { required: true, unique: true, minlength: 3 }),
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
	},
	language: { type: String, default: 'pl' },
	roles: { type: [{ type: Number, enum: Object.keys(roles).map(Number) }], default: [1], required: true },
	banned: { type: Boolean, default: false },

	authMethod: { type: String, enum: AUTH_METHODS, required: true, default: 'local' },
	oauthId: { type: String, default: undefined },
	passwordHash: {
		type: String,
		required() {
			return this.authMethod === 'local';
		},
		select: false,
	},
	activeAccount: { type: Boolean, default: false },
	verificationCode: {
		type: String,
		default: undefined,
		validate: {
			validator(v) {
				return this.activeAccount || (typeof v === 'string' && v.length > 0);
			},
			message: 'Verification code is required before account activation',
		},
	},
	passwordReset: {
		token: { type: String, default: undefined },
		expires: { type: Date, default: undefined },
	},

	onboardingCompleted: { type: Boolean, default: false },
	profileHidden: { type: Boolean, default: false },
	verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
	verificationReason: text(500),
	avatar: text(0, { default: '' }),
	banner: text(0, { default: '' }),
	bio: {
		value: text(1000),
		public: { type: Boolean, default: false },
	},
	discord: text(60),
	region: text(120),
	location: {
		countryIso2: text(2),
		countryName: text(120),
		stateId: text(20),
		stateName: text(120),
		city: text(120),
	},

	contactEmails: { type: [ContactEmailSchema], default: [] },
	websites: { type: [WebsiteSchema], default: [] },
	companions: { type: [CompanionSchema], default: [] },
	devices: { type: [DeviceSchema], default: [] },
}, { versionKey: false, timestamps: true });

const partialUnique = field => [{ [field]: 1 }, { unique: true, partialFilterExpression: { [field]: { $exists: true } } }];

UserSchema.index(...partialUnique('verificationCode'));
UserSchema.index(...partialUnique('passwordReset.token'));
UserSchema.index({ authMethod: 1, oauthId: 1 }, { unique: true, partialFilterExpression: { oauthId: { $exists: true } } });
UserSchema.index({ 'companions.name': 1 }, { unique: true });
UserSchema.index(...partialUnique('companions.publicKey'));
UserSchema.index({ 'devices.publicKey': 1 });
UserSchema.index({ 'contactEmails.verificationToken': 1 }, { sparse: true });

module.exports = model('User', UserSchema);
