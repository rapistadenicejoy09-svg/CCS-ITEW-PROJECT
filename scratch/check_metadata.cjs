const { MongoClient } = require('mongodb');
const fs = require('fs');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const uri = env.match(/MONGODB_URI=(.*)/)[1].trim();
  const dbName = env.match(/MONGODB_DB=(.*)/)[1].trim();

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('--- Inspecting File Metadata ---');
    const files = await db.collection('instruction_files.files').find({}).toArray();
    
    files.forEach(f => {
      console.log(`ID: ${f._id.toString()}`);
      console.log(`  Filename (GridFS): ${f.filename}`);
      console.log(`  Length: ${f.length}`);
      console.log(`  ContentType: ${f.metadata?.contentType || 'NULL'}`);
      console.log('---------------------------');
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
