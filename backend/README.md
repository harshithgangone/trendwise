# TrendWise Backend

A powerful Fastify-based backend for the TrendWise AI-powered blog platform.

## Features

- 🚀 **Fastify Framework** - High-performance web framework
- 🤖 **AI Integration** - Groq with Mistral model for content generation
- 🕷️ **Web Crawling** - Puppeteer for trend discovery
- 📊 **MongoDB Database** - Scalable document storage
- 🔄 **Automated Bot** - Scheduled content generation
- 📈 **Trend Analysis** - Google Trends and Twitter integration
- 🛡️ **Security** - CORS, Helmet, and input validation
- 📝 **RESTful APIs** - Complete CRUD operations

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Groq API key

### Installation

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Start production server**
   \`\`\`bash
   npm start
   \`\`\`

## API Endpoints

### Articles
- `GET /api/articles` - Get all articles
- `GET /api/articles/:slug` - Get article by slug
- `GET /api/articles/trending/top` - Get trending articles
- `GET /api/articles/tag/:tag` - Get articles by tag

### Comments
- `GET /api/comments?articleId=:id` - Get comments for article
- `POST /api/comments` - Create new comment
- `DELETE /api/comments/:id` - Delete comment (admin)
- `PATCH /api/comments/:id/status` - Update comment status

### Trends
- `GET /api/trends/current` - Get current trending topics
- `GET /api/trends/search/:query` - Search trend data

### Admin
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/admin/trigger-bot` - Manually trigger content bot
- `GET /api/admin/bot-status` - Get bot status
- `POST /api/admin/toggle-bot` - Start/stop bot
- `GET /api/admin/articles` - Get all articles (admin view)
- `DELETE /api/admin/articles/:id` - Delete article
- `PATCH /api/admin/articles/:id/status` - Update article status

## Environment Variables

\`\`\`env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trendwise

# AI Service
GROQ_API_KEY=your_groq_api_key

# External APIs
UNSPLASH_ACCESS_KEY=your_unsplash_key

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
\`\`\`

## Database Models

### Article
- title, slug, content, excerpt
- tags, meta (SEO), media
- views, status, trendData
- timestamps

### Comment
- articleId, content, author
- status (approved/pending/rejected)
- timestamps

### User
- name, email, image
- provider, providerId, role
- isActive, timestamps

## Services

### TrendBot
- Automated content generation
- Runs every 6 hours
- Processes Google Trends and Twitter trends
- Generates SEO-optimized articles

### TrendCrawler
- Web scraping with Puppeteer
- Google Trends API integration
- Media content discovery
- Related article search

### GroqService
- AI-powered content generation
- Article structure optimization
- SEO meta generation
- Content summarization

## Deployment

### Docker
\`\`\`bash
docker build -t trendwise-backend .
docker run -p 3001:3001 trendwise-backend
\`\`\`

### Docker Compose
\`\`\`bash
docker-compose up -d
\`\`\`

### Manual Deployment
1. Install dependencies: `npm ci --production`
2. Set environment variables
3. Start with PM2: `pm2 start src/server.js --name trendwise-backend`

## Development

### Project Structure
\`\`\`
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Main server file
├── package.json
├── Dockerfile
└── docker-compose.yml
\`\`\`

### Scripts
- `npm run dev` - Development with nodemon
- `npm start` - Production server
- `npm test` - Run tests

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details
