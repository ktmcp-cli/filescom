import Conf from 'conf';

const config = new Conf({
  projectName: 'ktmcp-filescom',
  schema: {
    apiKey: { type: 'string', default: '' },
    subdomain: { type: 'string', default: '' }
  }
});

export function getConfig(key) { return config.get(key); }
export function setConfig(key, value) { config.set(key, value); }
export function getAllConfig() { return config.store; }
export function clearConfig() { config.clear(); }
export function isConfigured() { return !!config.get('apiKey'); }

export default config;
