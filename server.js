/**
 * Express Proxy Server for Claude API
 * Handles Anthropic API requests server-side to avoid CORS issues
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;

    // Validate request
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields: imageBase64, mimeType, and prompt are required',
      });
    }

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return res.status(500).json({
        error: 'Server configuration error: API key not found',
      });
    }

    // Get model from environment variable, default to claude-3-5-sonnet-20240620
    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';

    // Forward request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific error cases
      if (response.status === 401) {
        return res.status(401).json({
          error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.',
        });
      } else if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again in a moment.',
        });
      } else if (response.status === 400) {
        return res.status(400).json({
          error: errorData.error?.message || 'Invalid request to Claude API',
        });
      } else {
        return res.status(response.status).json({
          error: `API error: ${response.status} ${response.statusText}`,
          details: errorData,
        });
      }
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse and return JSON
    try {
      const parsed = JSON.parse(jsonText);
      res.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      res.status(500).json({
        error: 'Failed to parse Claude response as JSON. The AI may have returned invalid data.',
        rawResponse: content.substring(0, 500), // Include first 500 chars for debugging
      });
    }
  } catch (error) {
    console.error('Error in Claude proxy:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Claude API Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api/claude`);
});

