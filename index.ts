import express from "express";
import fetchRedditTrends from './reddit/trends';
import storage from './data/storage';
import fetch from 'node-fetch';

require('dotenv').config();
import { telexIntegrationConfig } from './integration'


const app = express();
const PORT = process.env.PORT || 3000;
const url = process.env.TELEX_RETURN_URL;

app.use(express.json());


interface TelexResponse {
  event_name: string;
  message: string;
  status: string;
  username: string;
}

// Endpoint to retrieve telexIntegrationConfig
app.get('/integration', (req, res) => {
  res.json(telexIntegrationConfig);
});


async function sendTelexResponse(channelId: string, message: string): Promise<void> {
  const response: TelexResponse = {
    event_name: 'Social media Trends',
    message,
    status: 'success',
    username: 'WIT',
  };

  try {
    const telex_webhooks = `${url}/${channelId}`;
    const result = await fetch(telex_webhooks, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    });

    if (!result.ok) {
      throw new Error(`Failed to send response to Telex: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Error sending response to Telex:', error);
    throw error;
  }
}


app.get('/trends', async (req, res) => {
  const channelId = req.body.channel_id;

  try {
    const trends = await fetchRedditTrends();

    // Retrieve stored user preferences
    const storedPreferences = await storage.get('preferences');
    const userPreferences: string[] = storedPreferences ? JSON.parse(storedPreferences) : [];

    // Filter trends based on user preferences
    const filteredTrends = userPreferences.length
      ? userPreferences.reduce((acc: Record<string, any[]>, category: string) => {
          acc[category] = trends[category] || [];
          return acc;
        }, {})
      : trends; // Return all trends if no preferences are set

    // Convert filtered trends to a message string
    const message = Object.entries(filteredTrends)
      .map(([category, items]) => {
        const itemsList = items.map(item => `- [${item.title}](${item.url})`).join('\n');
        return `**${category.toUpperCase()}**\n${itemsList}`;
      })
      .join('\n\n');

    

    // Send trends to Telex webhook dynamically
    await sendTelexResponse(channelId, message);

    res.json({ trends: filteredTrends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

app.post('/preferences', async (req, res) => {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
        res.status(400).json({ error: 'Invalid categories format' });
        return;
    }

    await storage.put('preferences', JSON.stringify(categories));
    res.json({ message: 'Preferences saved successfully' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


