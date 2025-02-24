import axios from 'axios';

// Define interfaces for the Reddit API response
interface RedditPost {
  data: {
    title: string;
    permalink: string;
  };
}

interface RedditAPIResponse {
  data: {
    children: RedditPost[];
  };
}

const CATEGORIES = [
  'politics', 'crypto', 'tech', 'gossip', 'business',
  'sports', 'education', 'football', 'nigeria-politics', 'nigeria-news'
];

async function fetchRedditTrends(): Promise<Record<string, { title: string; url: string }[]>> {
  const trends: Record<string, { title: string; url: string }[]> = {};

  for (const category of CATEGORIES) {
    try {
      const url = `https://www.reddit.com/r/${category}/hot.json?limit=5`;
      const response = await axios.get<RedditAPIResponse>(url);

      // Ensure response.data and response.data.children are defined
      if (response.data?.data?.children) {
        trends[category] = response.data.data.children.map((child) => ({
          title: child.data.title,
          url: `https://www.reddit.com${child.data.permalink || ''}`,
        }));
      } else {
        trends[category] = [];
      }
    } catch (error) {
      console.error(`Error fetching ${category} trends:`, error);
      trends[category] = [];
    }
  }

  return trends;
}

export default fetchRedditTrends;
