import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { MongoClient } from 'mongodb';
import { parse } from 'url';
import http from 'http';


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

const server = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Basic routing
  if (req.method === "GET") {
    switch (req.url) {
      case "/":
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Welcome to the Vercel Node.js server!",
            timestamp: new Date().toISOString(),
          }),
        );
        break;

      case "/health":
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "healthy" }));
        break;

      default:
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not found" }));
    }
  } else {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
  }
};
