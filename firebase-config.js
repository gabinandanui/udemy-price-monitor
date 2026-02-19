const admin = require('firebase-admin');

function initFirebase() {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
  );
  admin.initializeApp({ 
    credential: admin.credential.cert(serviceAccount) 
  });
  console.log('✅ Firebase ready');
}

function getDb() {
  return admin.firestore();
}

module.exports = { initFirebase, getDb };