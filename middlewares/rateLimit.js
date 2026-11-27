import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisClient from '../services/redis.js';

// `redis: false` keeps the counters in memory, for apps that can run without a configured Redis server
export default ({ prefix, redis = true, ...options }) => rateLimit({
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	store: redis ? new RedisStore({ sendCommand: (...args) => RedisClient.sendCommand(args), prefix }) : undefined,
	...options,
});
