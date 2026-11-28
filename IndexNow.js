import fs from 'node:fs';
import axios from './services/axios.js';
import pkg from '../package.json' with { type: 'json' };

// A site served under several domains passes them as arguments, otherwise the one from `homepage` is submitted
const args = process.argv.slice(2);
const DOMAINS = args.length ? args : [new URL(pkg.homepage).host];
const BATCH_SIZE = 10000;

// Every site has its own key: the one public/<key>.txt file whose content equals its name (IndexNow requirement)
const findKey = () => {
	const keys = fs.readdirSync('public')
		.filter(file => (/^[a-zA-Z0-9-]{8,128}\.txt$/).test(file))
		.map(file => file.slice(0, -4))
		.filter(key => fs.readFileSync(`public/${key}.txt`, 'utf8').trim() === key);
	if (keys.length !== 1) throw new Error(`Expected exactly one IndexNow key file in public/, found ${keys.length}`);
	return keys[0];
};

const parseSitemap = async domain => {
	const { data: xml } = await axios.get(`https://${domain}/sitemap.xml`);
	return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].trim());
};

const submitToIndexNow = async (domain, key, urls, batchNum, totalBatches) => {
	try {
		const payload = {
			host: domain,
			key,
			keyLocation: `https://${domain}/${key}.txt`,
			urlList: urls,
		};

		const { status, statusText } = await axios.post('https://api.indexnow.org/indexnow', payload, {
			headers: { 'Content-Type': 'application/json' },
		});

		console.log(`[OK] Batch ${batchNum}/${totalBatches} | ${urls.length} URLs | Response: ${status} ${statusText}`);
	} catch (err) {
		const status = err.response?.status || 'Unknown';
		const body = err.response?.data ? JSON.stringify(err.response.data) : '';
		console.error(`[FAIL] Batch ${batchNum}/${totalBatches} | ${urls.length} URLs | Status: ${status} | ${body} | Msg: ${err.message}`);
	}
};

const submitDomain = async (domain, key) => {
	console.log('Domain:', domain);

	const urls = await parseSitemap(domain);
	console.log(`Parsed URLs: ${urls.length}`);

	const totalBatches = Math.ceil(urls.length / BATCH_SIZE);

	for (let i = 0; i < urls.length; i += BATCH_SIZE) {
		const chunk = urls.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		console.log(`Submitting batch ${batchNum}/${totalBatches} (${chunk.length} URLs, range ${i + 1}-${i + chunk.length})`);
		await submitToIndexNow(domain, key, chunk, batchNum, totalBatches);
	}
};

(async () => {
	const key = findKey();
	for (const domain of DOMAINS) await submitDomain(domain, key);

	console.log('All batches processed.');
	process.exit(0);
})().catch(err => {
	console.error('Unexpected error:', err);
	process.exit(1);
});
