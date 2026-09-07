const { createClient } = require('redis');

const RedisClient = createClient({
	socket: {
		host: process.env.REDIS_HOST,
		port: 6379,
		connectTimeout: 18 * 1000,
		reconnectStrategy: times => Math.min(times * 5000, 15000),
	},
	database: 8,
	password: process.env.REDIS_PASSWD,
});

let hasErrored = false;

RedisClient.on('connect', () => {
	console.log('Connected to Redis successfully');
	hasErrored = false;
});

RedisClient.on('error', err => {
	if (hasErrored) return;
	console.error('Redis error:', err.message);
	hasErrored = true;
});

void RedisClient.connect();

module.exports = RedisClient;