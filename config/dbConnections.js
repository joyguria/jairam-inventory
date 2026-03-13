const buildDbUri = (baseUri, dbName) => {
  if (!baseUri || !dbName) return baseUri;
  const match = String(baseUri).match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\?.*)?$/i);
  if (!match) return baseUri;
  const prefix = match[1];
  const query = match[3] || '';
  return `${prefix}${dbName}${query}`;
};

const baseUri = process.env.AUTH_DB_URI || process.env.CONNECTION_STRING || '';
const authUri = buildDbUri(baseUri, 'jairamgroup_db');

module.exports = {
  authUri,
};
