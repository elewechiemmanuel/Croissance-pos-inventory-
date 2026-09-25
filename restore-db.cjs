const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

// Load your downloaded service account credentials
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// ⚠️ CHANGE THIS to match the exact name of your backup JSON file
const BACKUP_FILE = "firestore_backup_1790246543369.json"; 

async function restoreFirestore() {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
      console.error("Please update the BACKUP_FILE variable in the script to match your actual backup filename.");
      return;
    }

    console.log(`Reading backup file: ${BACKUP_FILE}...`);
    const rawData = fs.readFileSync(BACKUP_FILE, "utf8");
    const backupData = JSON.parse(rawData);

    for (const collectionName of Object.keys(backupData)) {
      console.log(`Restoring collection: ${collectionName}...`);
      const documents = backupData[collectionName];

      for (const doc of documents) {
        const { id, ...data } = doc;
        // Write each document back to Firestore using its original ID
        await db.collection(collectionName).doc(id).set(data);
      }
    }

    console.log("✅ Success! Database has been fully restored from the backup.");
  } catch (error) {
    console.error("❌ Error restoring database:", error);
  }
}

restoreFirestore();