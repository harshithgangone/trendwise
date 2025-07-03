const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    // Use the working API key
    this.apiKey = "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"
    this.model = "llama-3.1-8b-instant"
    this.requestTimeout = 30000
    this.maxRetries = 3
    this.rateLimitDelay = 2000

    this.client = new Groq({
      apiKey: this.apiKey,
    })

    console.log(`🔑 [GROQ SERVICE] API Key initialized: ${this.apiKey ? "Present" : "Missing"}`)
  }

  async generateArticleContent(article) {
    console.log("🤖 [GROQ SERVICE] Starting article content generation...")
    console.log(`📝 [GROQ SERVICE] Article: "${article.title?.substring(0, 50)}..."`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key found, using fallback content")
      return this.generateFallbackContent(article)
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay))

      const prompt = this.createArticlePrompt(article)
      console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional content writer and SEO expert. Create high-quality, engaging content with proper HTML structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: this.model,
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
      })

      const content = completion.choices[0]?.message?.content

      if (content) {
        console.log(`✅ [GROQ SERVICE] Successfully generated ${content.length} characters of content`)
        return {
          success: true,
          title: article.title,
          content: content,
          excerpt: article.description || this.generateExcerpt(content),
          tags: this.extractTags(article.title, article.description || ""),
          seo: this.generateSEOData(article),
          source: "groq_ai",
        }
      }

      throw new Error("No content received from Groq API")
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Content generation failed:", error.message)
      console.log("🔄 [GROQ SERVICE] Falling back to template content...")
      return this.generateFallbackContent(article)
    }
  }

  async generateTweetContent(query, limit = 5) {
    console.log("🐦 [GROQ SERVICE] Generating tweet content...")
    console.log(`📊 [GROQ SERVICE] Query: ${query}`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key, returning mock tweets")
      return this.generateMockTweets(query, limit)
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay))

      const prompt = `Generate ${limit} realistic Twitter-style tweets about "${query}". 

Requirements:
- Each tweet should be under 280 characters
- Use realistic Twitter usernames and handles
- Include relevant hashtags and emojis
- Make them sound like real people discussing the topic
- Vary the tone (excited, analytical, skeptical, informative)
- Include different perspectives

Respond with ONLY valid JSON in this format:
{
"tweets": [
  {
    "username": "TechReporter",
    "handle": "@techreporter",
    "text": "Breaking: [tweet content with emojis and hashtags]",
    "engagement": {
      "likes": 150,
      "retweets": 45,
      "replies": 23
    }
  }
]
}`

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a social media expert. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: this.model,
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      })

      const content = completion.choices[0]?.message?.content

      if (content) {
        try {
          const parsed = JSON.parse(content)
          console.log("✅ [GROQ SERVICE] Tweet content generated successfully")
          return parsed.tweets.map((tweet, index) => ({
            username: tweet.username || `User${index + 1}`,
            handle: tweet.handle || `@user${index + 1}`,
            text: tweet.text || `Interesting developments in ${query}! 🚀`,
            link: this.createTwitterSearchUrl(query),
            timestamp: new Date(Date.now() - index * 3600000).toISOString(),
            engagement: tweet.engagement || {
              likes: Math.floor(Math.random() * 500) + 50,
              retweets: Math.floor(Math.random() * 100) + 10,
              replies: Math.floor(Math.random() * 50) + 5,
            },
          }))
        } catch (parseError) {
          console.error("❌ [GROQ SERVICE] JSON parsing failed:", parseError.message)
          return this.generateMockTweets(query, limit)
        }
      }

      return this.generateMockTweets(query, limit)
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Tweet generation failed:", error.message)
      return this.generateMockTweets(query, limit)
    }
  }

  generateMockTweets(query, limit = 5) {
    const mockTweets = [
      {
        username: "TechNewsDaily",
        handle: "@technewsdaily",
        text: `🚨 BREAKING: ${query.substring(0, 100)} - This could be a game changer! What are your thoughts? #TechNews #Innovation #Breaking`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date().toISOString(),
        engagement: { likes: 342, retweets: 89, replies: 45 },
      },
      {
        username: "IndustryAnalyst",
        handle: "@industryanalyst",
        text: `Deep dive analysis: ${query.substring(0, 80)} represents a significant shift in market dynamics. Thread below 🧵 #Analysis #MarketTrends`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        engagement: { likes: 156, retweets: 34, replies: 28 },
      },
      {
        username: "TechSkeptic",
        handle: "@techskeptic",
        text: `Hmm, not sure about ${query.substring(0, 60)}... We've seen similar promises before. Prove me wrong! 🤔 #TechSkepticism #ShowMeTheData`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        engagement: { likes: 89, retweets: 12, replies: 67 },
      },
      {
        username: "FutureTechFan",
        handle: "@futuretechfan",
        text: `OMG YES! 🎉 ${query.substring(0, 70)} is exactly what we needed! The future is here and I'm here for it! #FutureTech #Excited #Innovation`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        engagement: { likes: 234, retweets: 67, replies: 19 },
      },
      {
        username: "DataDrivenDev",
        handle: "@datadrivendev",
        text: `Interesting data points around ${query.substring(0, 50)}. Looking at the metrics, this could impact adoption rates significantly 📊 #Data #Metrics`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        engagement: { likes: 178, retweets: 23, replies: 31 },
      },
    ]

    return mockTweets.slice(0, limit)
  }

  createTwitterSearchUrl(query) {
    const encodedQuery = encodeURIComponent(query)
    return `https://twitter.com/search?q=${encodedQuery}&src=typed_query&f=live`
  }

  createArticlePrompt(article) {
    const title = article.title || "Untitled Article"
    const excerpt = article.excerpt || article.description || "No description available"
    const category = article.category || "General"
    const tags = Array.isArray(article.tags) ? article.tags.join(", ") : "technology, news"

    return `Write a comprehensive, SEO-optimized blog article about: "${title}"

Article Details:
- Category: ${category}
- Tags: ${tags}
- Brief Description: ${excerpt}

Requirements:
1. Write 1200-1800 words of engaging, informative content
2. Use proper HTML formatting with semantic tags
3. Structure with <h2> and <h3> headings for sections
4. Use <p> tags for paragraphs
5. Include <ul> or <ol> lists where appropriate
6. Use <strong> and <em> for emphasis
7. Make it SEO-friendly with natural keyword integration
8. Write in a professional, engaging tone
9. Include relevant insights and analysis
10. Add practical takeaways for readers

HTML Structure Requirements:
- Start with an engaging introduction paragraph
- Use <h2> for main sections (4-5 sections)
- Use <h3> for subsections where appropriate
- Use <p> tags for all paragraphs
- Include bullet points using <ul><li> tags
- Use <strong> for important terms
- End with a conclusion paragraph

Focus on providing value to readers while maintaining readability and SEO best practices. Return ONLY the HTML content without any markdown or additional formatting.`
  }

  generateFallbackContent(article) {
    console.log("🎭 [GROQ SERVICE] Generating fallback content...")

    const title = article.title || "Trending Topic"
    const excerpt = article.excerpt || article.description || "Latest developments in this trending topic"
    const category = article.category || "Technology"

    const content = `<p>${excerpt}</p>

<h2>Overview</h2>
<p>This trending topic has been gaining significant attention across various platforms and communities. Our analysis reveals several key insights and developments that are worth exploring in detail.</p>

<h2>Key Developments</h2>

<h3>Current Situation</h3>
<p>The current landscape shows interesting patterns and trends that indicate significant changes in the industry. These developments are particularly noteworthy because they represent a shift in how we approach and understand this domain.</p>

<h3>Market Impact</h3>
<p>The implications of these changes extend beyond immediate effects, potentially reshaping entire market segments and influencing future strategies across multiple industries.</p>

<h3>Expert Perspectives</h3>
<p>Industry experts have shared valuable insights about these developments, highlighting both opportunities and challenges that lie ahead.</p>

<h2>Analysis and Insights</h2>

<h3>Technical Aspects</h3>
<p>From a technical standpoint, these developments showcase innovative approaches and methodologies that could become standard practices in the near future.</p>

<h3>Business Implications</h3>
<p>Organizations are closely monitoring these trends to understand how they might impact their operations, strategies, and competitive positioning.</p>

<h3>Future Outlook</h3>
<p>Looking ahead, several factors will likely influence how these trends evolve and what impact they will have on the broader ecosystem.</p>

<h2>Key Takeaways</h2>
<ul>
<li><strong>Innovation Drive:</strong> These developments represent significant innovation in the field</li>
<li><strong>Market Opportunity:</strong> New opportunities are emerging for businesses and individuals</li>
<li><strong>Strategic Importance:</strong> Organizations should consider these trends in their strategic planning</li>
<li><strong>Continuous Evolution:</strong> The landscape continues to evolve rapidly, requiring ongoing attention</li>
</ul>

<h2>Conclusion</h2>
<p>As we continue to monitor these developments, it's clear that staying informed and adaptable will be crucial for success. The trends we're seeing today are likely to shape the future of this domain significantly.</p>

<p><em>Stay tuned for more updates and analysis on this evolving topic.</em></p>`

    console.log(`✅ [GROQ SERVICE] Generated ${content.length} characters of fallback content`)

    return {
      success: false,
      content,
      excerpt: excerpt.substring(0, 160),
      tags: ["trending", "news", "analysis"],
      seo: this.generateSEOData(article),
      source: "fallback_template",
      reason: "API unavailable or failed",
    }
  }

  generateSEOData(article) {
    const title = article.title || "Trending News"
    const excerpt = article.excerpt || article.description || "Latest trending news and updates"
    const tags = Array.isArray(article.tags) ? article.tags : ["technology", "news"]

    return {
      metaTitle: title.length > 60 ? title.substring(0, 57) + "..." : title,
      metaDescription: excerpt.length > 160 ? excerpt.substring(0, 157) + "..." : excerpt,
      keywords: tags.join(", "),
      ogTitle: title,
      ogDescription: excerpt.substring(0, 200),
      twitterTitle: title.substring(0, 70),
      twitterDescription: excerpt.substring(0, 200),
    }
  }

  async testConnection() {
    console.log("🔧 [GROQ SERVICE] Testing connection...")

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key configured")
      return {
        success: false,
        error: "No API key configured",
        fallbackAvailable: true,
      }
    }

    try {
      console.log("📡 [GROQ SERVICE] Testing API connection...")

      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello, this is a connection test." }],
        model: this.model,
        max_tokens: 10,
      })

      console.log("✅ [GROQ SERVICE] Connection test successful")
      return {
        success: true,
        model: this.model,
        status: "connected",
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)

      return {
        success: false,
        fallbackAvailable: true,
        error: error.message,
      }
    }
  }

  generateExcerpt(content) {
    const plainText = content
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
    return plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText
  }

  extractTags(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const commonTags = [
      "ai",
      "artificial intelligence",
      "technology",
      "business",
      "startup",
      "innovation",
      "science",
      "health",
      "finance",
      "digital",
      "software",
      "data",
      "security",
      "blockchain",
      "cryptocurrency",
      "machine learning",
      "automation",
      "cloud",
      "mobile",
      "web",
    ]

    const foundTags = commonTags.filter((tag) => text.includes(tag))
    return foundTags.length > 0 ? foundTags.slice(0, 5) : ["technology", "news"]
  }

  getStats() {
    return {
      apiKey: this.apiKey ? "configured" : "missing",
      model: this.model,
      timeout: this.requestTimeout,
      maxRetries: this.maxRetries,
      rateLimitDelay: this.rateLimitDelay,
    }
  }
}

// Create a singleton instance
const groqServiceInstance = new GroqService()

// Export both the class and the instance
module.exports = groqServiceInstance

// Also export the generateArticleContent function directly for backward compatibility
async function generateArticleContent(newsItem) {
  try {
    console.log(`🤖 [GROQ] Generating content for: ${newsItem.title.substring(0, 50)}...`)

    const prompt = `
You are a professional content writer for TrendWise, an AI-powered blog platform. 
Create a comprehensive, engaging article based on this news item:

Title: ${newsItem.title}
Description: ${newsItem.description}
Source: ${newsItem.source?.name}
URL: ${newsItem.url}

Requirements:
1. Write a compelling, SEO-optimized article (800-1200 words)
2. Use proper HTML formatting with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags
3. Create an engaging excerpt (150-200 characters)
4. Generate 5-7 relevant tags
5. Create 3-5 AI-generated tweet-style social media posts
6. Make it informative, engaging, and professional
7. Include proper headings and subheadings
8. Add bullet points where appropriate
9. Ensure the content is original and adds value beyond the source

Format your response as JSON:
{
"title": "Enhanced article title",
"content": "Full HTML article content with proper tags",
"excerpt": "Compelling excerpt",
"tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
"tweets": ["tweet1", "tweet2", "tweet3"],
"readTime": 6
}
`

    const completion = await groqServiceInstance.client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert content writer and SEO specialist. Always respond with valid JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error("No response from Groq API")
    }

    let parsedContent
    try {
      parsedContent = JSON.parse(response)
    } catch (parseError) {
      console.error("❌ [GROQ] JSON parsing failed:", parseError)
      // Fallback content
      parsedContent = {
        title: newsItem.title,
        content: `<h2>${newsItem.title}</h2><p>${newsItem.description}</p>`,
        excerpt: newsItem.description?.substring(0, 150) + "...",
        tags: ["News", "Trending", "Current Events"],
        tweets: [
          `Breaking: ${newsItem.title.substring(0, 100)}...`,
          `Latest update on ${newsItem.title.substring(0, 80)}... #trending`,
          `What you need to know about ${newsItem.title.substring(0, 70)}...`,
        ],
        readTime: 3,
      }
    }

    // Validate and clean the content
    const cleanedContent = {
      title: parsedContent.title || newsItem.title,
      content: parsedContent.content || `<p>${newsItem.description}</p>`,
      excerpt: parsedContent.excerpt || newsItem.description?.substring(0, 150) + "...",
      tags: Array.isArray(parsedContent.tags) ? parsedContent.tags : ["News", "Trending"],
      tweets: Array.isArray(parsedContent.tweets) ? parsedContent.tweets : [],
      readTime: parsedContent.readTime || 3,
    }

    console.log(`✅ [GROQ] Content generated successfully for: ${cleanedContent.title.substring(0, 50)}...`)
    return cleanedContent
  } catch (error) {
    console.error("❌ [GROQ] Error generating content:", error)

    // Return fallback content
    return {
      title: newsItem.title,
      content: `
        <h2>${newsItem.title}</h2>
        <p>${newsItem.description}</p>
        <p>This article is based on breaking news from ${newsItem.source?.name}. 
        We are continuously updating our content to provide you with the most accurate and up-to-date information.</p>
        <h3>Key Points</h3>
        <ul>
          <li>Breaking news development</li>
          <li>Ongoing story coverage</li>
          <li>Regular updates available</li>
        </ul>
      `,
      excerpt: newsItem.description?.substring(0, 150) + "..." || "Breaking news update",
      tags: ["Breaking News", "Current Events", "Trending"],
      tweets: [
        `🚨 Breaking: ${newsItem.title.substring(0, 100)}...`,
        `Latest: ${newsItem.title.substring(0, 120)} #news`,
        `Update: ${newsItem.title.substring(0, 110)} - stay informed!`,
      ],
      readTime: 2,
    }
  }
}

module.exports.generateArticleContent = generateArticleContent
