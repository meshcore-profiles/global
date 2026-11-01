const { connect, connection } = require('mongoose');

connect(process.env.MONGODB_URL).catch(err => {
	console.error('Failed to connect to the database', err);
	process.exit(1);
});

connection.on('connected', () => console.log('Connected to the database successfully'));

let closing = false;
connection.on('disconnecting', () => closing = true);
connection.on('disconnected', () => (closing ? console.log('MongoDB disconnected') : console.warn('MongoDB disconnected unexpectedly!')));

connection.on('error', err => {
	console.error('MongoDB error:', err.message);
	process.exit(1);
});

module.exports = connection;