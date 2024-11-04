
import dotenv from 'dotenv';
import path from 'path';
import OpenAI from "openai";
import Sentiment from 'sentiment';
import { MongoClient } from 'mongodb';
import cron from 'node-cron';

dotenv.config({ path: path.resolve('../.env') });

const client = new MongoClient(process.env.MONGO_URI);

const dbName = 'polarinchDB';

async function connectToDatabase(collectionName) {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    return client.db(dbName).collection(collectionName);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sentiment = new Sentiment();

const topics = ["nba", "motogp", "formula 1", "bitcoin"];

async function generateTweet(topic, sentimentLabel) {
  const prompt = `Generate a ${sentimentLabel} tweet about ${topic}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates tweets with specified sentiments." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
    });

    const tweetText = response.choices[0].message.content.trim();
    return tweetText;
  } catch (error) {
    console.error("Error generating tweet:", error);
  }
}

async function createDataset() {
  const dataset = [];

  for (const topic of topics) {
    for (const sentimentLabel of ["positive", "negative", "neutral", "aggressive"]) {
      const tweetText = await generateTweet(topic, sentimentLabel);

      if (tweetText) {
        const sentimentAnalysis = sentiment.analyze(tweetText);
        dataset.push({
          topic,
          tweet: tweetText,
          generatedSentiment: sentimentLabel,
          calculatedSentiment: sentimentAnalysis.score > 0 ? 'positive' : sentimentAnalysis.score < 0 ? 'negative' : 'neutral',
          score: sentimentAnalysis.score,
        });
      }
    }
  }
  return dataset;
}

async function saveDatasetToMongoDB(dataset) {
  const collectionName = 'tweets';
  const tweetsCollection = await connectToDatabase(collectionName);

  try {
    const result = await tweetsCollection.insertMany(dataset);
    console.log(`Inserted ${result.insertedCount} documents into MongoDB`);
  } catch (error) {
    console.error("Error inserting documents:", error);
  } finally {
    await tweetsCollection.client.close();
  }
}

// Set up a cron job to run every hour
cron.schedule('* * * * *', async () => {
  try {
    console.log('Running cron job to generate dataset...');
    const dataset = await createDataset();
    await saveDatasetToMongoDB(dataset);
    console.log('Dataset generated and saved successfully');
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});
