import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.loadEnvFile();
await import('./mongoose.js');

const modelsPath = path.join(import.meta.dirname, 'models');

(async () => {
	try {
		const files = await fs.readdir(modelsPath, { recursive: true });

		for (const file of files.filter(f => f.endsWith('.js'))) {
			await import(pathToFileURL(path.join(modelsPath, file)).href);
		}

		for (const [name, model] of Object.entries(mongoose.models)) {
			const { toDrop, toCreate } = await model.diffIndexes();

			if (!toDrop.length && !toCreate.length) {
				continue;
			}

			console.log(`\n${name}`);

			if (toDrop.length) {
				console.log('Indexes to drop:');
				console.log(toDrop);
			}

			if (toCreate.length) {
				console.log('Indexes to create:');
				console.log(toCreate);
			}

			await model.syncIndexes();

			console.log(`Synced indexes for: ${name}`);
		}
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	} finally {
		await mongoose.disconnect();
	}
})();
