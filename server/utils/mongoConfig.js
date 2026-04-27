function isPlaceholderMongoUri(uri) {
  if (!uri) return true;
  return uri.includes('<') || uri.includes('YOUR_');
}

function isAtlasMongoUri(uri) {
  return typeof uri === 'string' && uri.startsWith('mongodb+srv://');
}

function isLocalMongoUri(uri) {
  if (typeof uri !== 'string') return false;
  return uri.startsWith('mongodb://127.0.0.1') || uri.startsWith('mongodb://localhost');
}

function maskMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

function validateMongoUri(uri) {
  if (!uri) {
    return {
      ok: false,
      reason: 'Missing MONGODB_URI.',
      hint: 'Set server/.env with your MongoDB Atlas connection string.',
    };
  }

  if (isPlaceholderMongoUri(uri)) {
    return {
      ok: false,
      reason: 'MONGODB_URI still contains the template placeholder.',
      hint: 'Replace it with your real MongoDB Atlas URI from the Atlas dashboard.',
    };
  }

  return { ok: true };
}

module.exports = {
  isAtlasMongoUri,
  isLocalMongoUri,
  maskMongoUri,
  validateMongoUri,
};
