const { MongoClient } = require("mongodb");

let clientPromise = null;

function getClientPromise() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }
  if (clientPromise) return clientPromise;
  clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  return clientPromise;
}

async function connectToDatabase() {
  const client = await getClientPromise();
  return client.db("LinkerX");
}

module.exports = { connectToDatabase };
