require('dotenv').config();
const mongoose = require('mongoose');
const { maskMongoUri, validateMongoUri } = require('./utils/mongoConfig');

const SOURCE_MONGODB_URI = process.env.SOURCE_MONGODB_URI || 'mongodb://127.0.0.1:27017/resqpulse';
const TARGET_MONGODB_URI = process.env.TARGET_MONGODB_URI || process.env.MONGODB_URI;
const COLLECTIONS = ['users', 'ambulances', 'hospitals', 'emergencycases'];

async function copyCollection(sourceDb, targetDb, name) {
  const docs = await sourceDb.collection(name).find({}).toArray();
  await targetDb.collection(name).deleteMany({});

  if (docs.length > 0) {
    await targetDb.collection(name).insertMany(docs);
  }

  console.log(`[Migrate] ${name}: copied ${docs.length} document(s)`);
}

async function run() {
  const validation = validateMongoUri(TARGET_MONGODB_URI);
  if (!validation.ok) {
    console.error(`[Migrate] ${validation.reason}`);
    console.error(`[Migrate] ${validation.hint}`);
    process.exit(1);
  }

  const source = await mongoose.createConnection(SOURCE_MONGODB_URI).asPromise();
  const target = await mongoose.createConnection(TARGET_MONGODB_URI).asPromise();

  try {
    console.log(`[Migrate] Source: ${maskMongoUri(SOURCE_MONGODB_URI)}`);
    console.log(`[Migrate] Target: ${maskMongoUri(TARGET_MONGODB_URI)}`);

    for (const name of COLLECTIONS) {
      await copyCollection(source.db, target.db, name);
    }

    console.log('[Migrate] Migration complete.');
  } finally {
    await source.close();
    await target.close();
  }
}

run().catch((err) => {
  console.error('[Migrate] Error:', err.message);
  process.exit(1);
});
