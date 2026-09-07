const { connect, connection } = require('mongoose');

connect(process.env.MONGODB_URL).catch(err => console.error('Failed to connect to the database', err));

connection.on('connected', () => console.log('Connected to the database successfully'));
connection.on('disconnected', () => console.warn('MongoDB disconnected!'));
connection.on('error', err => console.error('MongoDB error:', err.message));

module.exports = connection;
