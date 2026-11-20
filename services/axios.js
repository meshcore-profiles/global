import axios from 'axios';
import pkg from '../../package.json' with { type: 'json' };

const { name, version, homepage } = pkg;

axios.defaults.headers.common['User-Agent'] = `Mozilla/5.0 (compatible; ${name}/${version}; +${homepage})`;
axios.defaults.timeout = 14000;

export default axios;
