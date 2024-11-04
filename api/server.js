import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { MongoClient } from 'mongodb';
import { parse } from 'url';

dotenv.config({ path: path.resolve('../.env') });

const client = new MongoClient(process.env.MONGO_URI);
const dbName = 'polarinchDB';

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db(dbName);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Function to retrieve tweets by topic
async function getTweetsByTopic(topic) {
  const db = await connectToDatabase();
  const collection = db.collection('tweets');

  try {
    const tweets = await collection.aggregate([
      { $match: { topic } },
      //{ $sample: { size: 6 } }
    ]).toArray();

    return tweets;
  } catch (error) {
    console.error("Error retrieving tweets by topic:", error);
    throw error;
  }
}

// Function to retrieve random tweets with unique topics
async function getRandomTweets() {
  const db = await connectToDatabase();
  const collection = db.collection('tweets');

  try {
    const tweets = await collection.aggregate([
      {
        $group: {
          _id: "$topic",
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sample: { size: 6 } }
    ]).toArray();

    return tweets;
  } catch (error) {
    console.error("Error retrieving tweets:", error);
    throw error;
  }
}

// Helper function to send JSON responses
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Handler for the /api/tweets endpoint
async function handleGetTweetsByTopic(req, res, query) {
  const topic = query.topic;

  if (topic) {
    try {
      const tweets = await getTweetsByTopic(topic);
      sendJsonResponse(res, 200, { results: tweets });
    } catch (error) {
      sendJsonResponse(res, 500, { message: 'Error retrieving tweets for topic' });
    }
  } else {
    sendJsonResponse(res, 200, { results: [] });
  }
}

// Handler for the /api/random-tweets endpoint
async function handleGetRandomTweets(res) {
  try {
    const tweets = await getRandomTweets();
    sendJsonResponse(res, 200, { results: tweets });
  } catch (error) {
    sendJsonResponse(res, 500, { message: 'Error retrieving random tweets' });
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const parsedUrl = parse(req.url, true);
  const { pathname, query } = parsedUrl;

  if (req.method === 'GET' && pathname === '/api/tweets') {
    handleGetTweetsByTopic(req, res, query);
  } else if (req.method === 'GET' && pathname === '/api/random-tweets') {
    handleGetRandomTweets(res);
  } else {
    sendJsonResponse(res, 404, { message: 'Not Found' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
