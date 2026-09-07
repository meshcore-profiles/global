const { Schema, model } = require('mongoose');
const { roles } = require('../../../utils/roles.js');

const CompanionSchema = new Schema({
	name: { type: String, required: true, trim: true, maxlength: 60 },
	publicKey: { type: String, required: true, trim: true },
	model: { type: String, trim: true, maxlength: 60 },
	preset: { type: String, trim: true, maxlength: 30 },
	freq: { type: String, trim: true, maxlength: 30 },
	bw: { type: String, trim: true, maxlength: 30 },
	sf: { type: String, trim: true, maxlength: 30 },
	cr: { type: String, trim: true, maxlength: 30 },
	antenna: { type: String, trim: true, maxlength: 60 },
	main: { type: Boolean, default: false },
	photos: { type: [String], default: [] },
	public: { type: Boolean, default: false },
	verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
	verificationReason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

const DeviceSchema = new Schema({
	kind: { type: String, enum: ['repeater', 'roomServer'], required: true },
	name: { type: String, required: true, trim: true, maxlength: 60 },
	publicKey: { type: String, required: true, trim: true },
	note: { type: String, trim: true, maxlength: 500 },
	model: { type: String, trim: true, maxlength: 60 },
	preset: { type: String, trim: true, maxlength: 30 },
	freq: { type: String, trim: true, maxlength: 30 },
	bw: { type: String, trim: true, maxlength: 30 },
	sf: { type: String, trim: true, maxlength: 30 },
	cr: { type: String, trim: true, maxlength: 30 },
	antenna: { type: String, trim: true, maxlength: 60 },
	antennaType: { type: String, trim: true, maxlength: 60 },
	heading: { type: String, trim: true, maxlength: 30 },
	gain: { type: String, trim: true, maxlength: 30 },
	height: { type: String, trim: true, maxlength: 30 },
	power: { type: String, trim: true, maxlength: 60 },
	region: { type: String, trim: true, maxlength: 120 },
	photos: { type: [String], default: [], validate: { validator: v => v.length <= 5, message: 'Maximum 5 photos per device.' } },
	public: { type: Boolean, default: false },
	verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
	verificationReason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

const ContactEmailSchema = new Schema({
	address: { type: String, required: true, trim: true, lowercase: true },
	verified: { type: Boolean, default: false },
	primary: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	verificationToken: { type: String, trim: true },
	verificationExpires: { type: Date },
	verificationSentAt: { type: Date },
}, { timestamps: true });

const WebsiteEntrySchema = new Schema({
	domain: { type: String, required: true, trim: true, lowercase: true, maxlength: 253 },
	verified: { type: Boolean, default: false },
	public: { type: Boolean, default: false },
	method: { type: String, enum: ['dns', 'file'] },
	verificationToken: { type: String, trim: true },
}, { timestamps: true });

const UserSchema = new Schema({
	username: { type: String, required: true, unique: true, index: true, trim: true, minlength: 3, maxlength: 25 },
	email: {
		type: String,
		required: true,
		unique: true,
		index: true,
		lowercase: true,
		trim: true,
		match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
	},
	passwordHash: { type: String, required: true, select: false },
	activeAccount: { type: Boolean, default: false },
	verificationCode: {
		type: String,
		default: undefined,
		validate: {
			validator(v) {
				if (!this.activeAccount) return typeof v === 'string' && v.length > 0;
				return true;
			},
			message: 'Verification code is required before account activation',
		},
	},
	banned: { type: Boolean, default: false },
	authMethod: { type: String, required: true, enum: ['local'], default: 'local' },
	language: { type: String, default: 'pl' },
	roles: { type: [Number], enum: Object.keys(roles).map(Number), default: [1], required: true },

	onboardingCompleted: { type: Boolean, default: false },
	verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
	verificationReason: { type: String, trim: true, maxlength: 500 },
	passwordReset: {
		token: { type: String, default: undefined },
		expires: { type: Date, default: undefined },
	},

	region: { type: String, trim: true, maxlength: 120 },
	location: {
		countryIso2: { type: String, trim: true, maxlength: 2 },
		countryName: { type: String, trim: true, maxlength: 120 },
		stateId: { type: String, trim: true, maxlength: 20 },
		stateName: { type: String, trim: true, maxlength: 120 },
		city: { type: String, trim: true, maxlength: 120 },
	},
	avatar: { type: String, trim: true, default: '' },
	banner: { type: String, trim: true, default: '' },
	bio: {
		value: { type: String, trim: true, maxlength: 1000 },
		public: { type: Boolean, default: false },
	},
	discord: { type: String, trim: true, maxlength: 60 },
	contactEmails: { type: [ContactEmailSchema], default: [] },
	websites: { type: [WebsiteEntrySchema], default: [] },
	companions: { type: [CompanionSchema], default: [] },
	devices: { type: [DeviceSchema], default: [] },
	profileHidden: { type: Boolean, default: false },
}, { versionKey: false, timestamps: true });

UserSchema.index(
	{ verificationCode: 1 },
	{ unique: true, partialFilterExpression: { verificationCode: { $exists: true } } }
);

UserSchema.index(
	{ 'passwordReset.token': 1 },
	{ unique: true, partialFilterExpression: { 'passwordReset.token': { $exists: true } } }
);

UserSchema.index({ 'companions.name': 1 }, { unique: true });
UserSchema.index({ 'companions.publicKey': 1 });
UserSchema.index({ 'devices.publicKey': 1 });

module.exports = model('User', UserSchema);
