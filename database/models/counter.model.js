import { Schema, model } from 'mongoose';

const CounterSchema = new Schema({
	_id: { type: String, required: true },
	seq: { type: Number, default: 0 },
}, { versionKey: false });

const Counter = model('Counter', CounterSchema);

const nextSequence = async name => (await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' }).lean()).seq;

export default Counter;

export { nextSequence };
