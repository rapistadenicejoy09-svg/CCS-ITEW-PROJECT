const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const uri = env.match(/MONGODB_URI=(.*)/)[1].trim();
  const dbName = env.match(/MONGODB_DB=(.*)/)[1].trim();

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('--- Collecting Data ---');
    const files = await db.collection('instruction_files.files').find({}).toArray();
    const instructions = await db.collection('instructions').find({ link: { $regex: '^gridfs://' } }).toArray();

    console.log(`Instructions with gridfs links: ${instructions.length}`);
    console.log(`Files in gridfs (instruction_files): ${files.length}`);

    const fileMap = new Map(files.map(f => [f._id.toString(), f]));
    
    instructions.forEach(i => {
      const fid = i.link.replace('gridfs://', '').trim();
      const filename = i.title;
      const found = fileMap.get(fid);
      
      if (!found) {
        console.log(`[MISSING] Instruction ${i.id} ('${filename}') -> File ID ${fid} NOT FOUND`);
      } else {
        console.log(`[OK] Instruction ${i.id} ('${filename}') -> File ID ${fid} FOUND (${found.filename})`);
      }
    });

    // Check if any files exist in OTHER buckets that we might be missing
    const collections = await db.listCollections().toArray();
    const otherBucketFiles = collections
      .filter(c => c.name.endsWith('.files') && c.name !== 'instruction_files.files')
      .map(c => c.name);
    
    for (const collName of otherBucketFiles) {
       const others = await db.collection(collName).find({}).toArray();
       if (others.length > 0) {
         console.log(`\n--- Other Bucket: ${collName} ---`);
         others.forEach(f => console.log(`- ID: ${f._id.toString()}, Filename: ${f.filename}`));
       }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
