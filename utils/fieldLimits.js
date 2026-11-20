export const NODE = {
	name: { min: 3, maxBytes: 31 },
	publicKeyLength: 64,
	pathHashSizes: [1, 2, 3],
	modelMax: 60,
	presetMax: 30,
	radio: {
		freq: { min: 433, max: 928 },
		bw: { min: 7.8, max: 500 },
		sf: { min: 5, max: 12 },
		cr: { min: 5, max: 8 },
	},
	antenna: {
		nameMax: 60,
		gain: { min: -10, max: 30 },
		heading: { min: 0, max: 360 },
		heightMetersMax: 600,
	},
	txPower: { min: -9, max: 30 },
	solarPanel: { min: 0.1, max: 500 },
	battery: { min: 1, max: 200000 },
	powerMax: 60,
	noteMax: 4000,
};

export const PROFILE = {
	slug: { min: 3, max: 30 },
	bioMax: 5000,
	placeMax: 120,
	stateIdMax: 20,
};

export const CONTACT = {
	emailMax: 320,
	domainMax: 253,
};
