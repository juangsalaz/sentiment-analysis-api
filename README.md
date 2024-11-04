# TwitSentiment API

This is backend for [this project](https://github.com/juangsalaz/sentiment-analysis-web) 

##  Dataset Generator
In this project, I generated a dataset using open AI API, I create a cron job running generate fake tweets function like this:

```
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
```

and the tweets data result will calculate the sentiment score using [sentiment js library](https://www.npmjs.com/package/sentiment)

```
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
```

The results of the createDataSet function is json data like this
```
{
    "results": [
        {
            "_id": "672833be88fe0357369f6ea7",
            "topic": "Monday",
            "tweet": "\"Embrace the magic of new beginnings. Monday is not the enemy, it's a fresh start filled with opportunities and chances to make it a glorious week. Make your coffee strong, set your goals high and watch amazing things happen. Happy Monday!",
            "generatedSentiment": "positive",
            "calculatedSentiment": "positive",
            "score": 15
        },
        {
            "_id": "672833be88fe0357369f6ea3",
            "topic": "MUFC",
            "tweet": "\"United we stand, always and forever! So grateful for the impeccable skill, teamwork and determination shown by #MUFC. Their spirit keeps inspiring millions around the world. Here's to many more victories! 🙌⚽️",
            "generatedSentiment": "positive",
            "calculatedSentiment": "positive",
            "score": 11
        }
        ...
    ]
}
```

For more details for this process, you can look at the file here [generateDataSet.js](https://github.com/juangsalaz/sentiment-analysis-api/blob/main/data/generateDataSet.js)

## Realtime Data
For implementation realtime data, we need running the cron job  to generate new fake data for example every 3 minutes (for simulation users make new tweets post in Twitter / X),  and then in the  frontend there is setInterval function to update the chart data every 5 minutes

##  API Endpoint
This API endpoint is to get data from MongoDB then show the data in the frontend side.
This is [API Docummentation ](https://documenter.getpostman.com/view/3460037/2sAY4xCNm5)

## Screenshots
![Screen Shot 2024-11-04 at 21 50 47](https://github.com/user-attachments/assets/12a19ee1-c5e7-446a-8e68-4a3d37bfc163)

![Screen Shot 2024-11-04 at 21 51 16](https://github.com/user-attachments/assets/749cd822-5abc-4c22-9442-3e3074d8bb1d)

