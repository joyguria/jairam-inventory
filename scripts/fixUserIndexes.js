require('dotenv').config({ path: __dirname + '/../.env' });

const mongoose = require('mongoose');
const { authUri } = require('../config/dbConnections');

const ensureAuthUri = () => {
  if (!authUri) {
    throw new Error('Missing CONNECTION_STRING');
  }
  return authUri;
};

const keyEquals = (a = {}, b = {}) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && a[k] === b[k]);
};

const main = async () => {
  const uri = ensureAuthUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const users = mongoose.connection.collection('users');
  const indexes = await users.indexes();

  for (const idx of indexes) {
    const isIdIndex = idx.name === '_id_';
    if (isIdIndex) continue;

    const isLegacyCodeIndex = keyEquals(idx.key, { code: 1 });
    const isLegacyInvestorCodeIndex = keyEquals(idx.key, { investorCode: 1 });

    if (isLegacyCodeIndex || isLegacyInvestorCodeIndex) {
      await users.dropIndex(idx.name);
      console.log(`Dropped legacy index: ${idx.name}`);
    }
  }

  await users.createIndex(
    { role: 1, code: 1 },
    {
      name: 'role_code_unique',
      unique: true,
      partialFilterExpression: {
        code: { $exists: true, $type: 'string' },
      },
    }
  );
  console.log('Ensured index: role_code_unique');

  await users.createIndex(
    { role: 1, investorCode: 1 },
    {
      name: 'role_investorCode_unique',
      unique: true,
      partialFilterExpression: {
        investorCode: { $exists: true, $type: 'string' },
      },
    }
  );
  console.log('Ensured index: role_investorCode_unique');

  await mongoose.disconnect();
  console.log('User index migration complete');
};

main().catch(async (err) => {
  console.error('Failed to fix user indexes:', err.message || err);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // no-op
  }
  process.exit(1);
});
