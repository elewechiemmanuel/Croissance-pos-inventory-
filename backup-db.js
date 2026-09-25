const admin = require("firebase-admin");
const fs = require("fs");

// Load your downloaded service account credentials
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const OUTPUT_FILE = `firestore_backup_${Date.now()}.json`;

async function backupFirestore() {
  try {
    console.log("Fetching database collections...");
    const collections = await db.listCollections();
    const backupData = {};

    for (const col of collections) {
      console.log(`Backing up collection: ${col.id}`);
      const snapshot = await col.get();
      backupData[col.id] = [];

      snapshot.forEach((doc) => {
        backupData[col.id].push({
          id: doc.id,
          ...doc.data()
        });
      });
    }

    // Write all data to a local JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(backupData, null, 2));
    console.log(`✅ Success! Backup saved locally as: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("❌ Error backing up database:", error);
  }
}

backupFirestore();