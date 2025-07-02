const axios = require("axios")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.model = "llama3-8b-8192" // Fast and efficient model
    this.requestTimeout = 30000 // 30 seconds
    this.maxRetries = 2
  }

  async generateArticleContent(article) {
    console.log("🤖 [GROQ SERVICE] Starting article content generation...")
    console.log(`📝 [GROQ SERVICE] Article: "${article.title?.substring(0, 50)}..."`)
    console.log(`🔑 [GROQ SERVICE] API Key: ${this.apiKey ? "Present" : "Missing"}`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key found, using fallback content")
      return this.generateFallbackContent(article)
    }

    try {
      const prompt = this.createArticlePrompt(article)
      console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

      const response = await this.makeGroqRequest(prompt)

      if (response && response.content) {
        console.log(`✅ [GROQ SERVICE] Successfully generated ${response.content.length} characters of content`)
        return {
          success: true,
          title: article.title,
          content: response.content,
          excerpt: article.description || this.generateExcerpt(response.content),
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

      const response = await this.makeGroqRequest(prompt, "json")

      if (response && response.tweets) {
        console.log("✅ [GROQ SERVICE] Tweet content generated successfully")
        return response.tweets.map((tweet, index) => ({
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
        text: `🚨 BREAKING: ${query} - This could be a game changer! What are your thoughts? #TechNews #Innovation #Breaking`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date().toISOString(),
        engagement: { likes: 342, retweets: 89, replies: 45 },
      },
      {
        username: "IndustryAnalyst",
        handle: "@industryanalyst",
        text: `Deep dive analysis: ${query} represents a significant shift in market dynamics. Thread below 🧵 #Analysis #MarketTrends`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        engagement: { likes: 156, retweets: 34, replies: 28 },
      },
      {
        username: "TechSkeptic",
        handle: "@techskeptic",
        text: `Hmm, not sure about ${query}... We've seen similar promises before. Prove me wrong! 🤔 #TechSkepticism #ShowMeTheData`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        engagement: { likes: 89, retweets: 12, replies: 67 },
      },
      {
        username: "FutureTechFan",
        handle: "@futuretechfan",
        text: `OMG YES! 🎉 ${query} is exactly what we needed! The future is here and I'm here for it! #FutureTech #Excited #Innovation`,
        link: this.createTwitterSearchUrl(query),
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        engagement: { likes: 234, retweets: 67, replies: 19 },
      },
      {
        username: "DataDrivenDev",
        handle: "@datadrivendev",
        text: `Interesting data points around ${query}. Looking at the metrics, this could impact adoption rates significantly 📊 #Data #Metrics`,
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

  async makeGroqRequest(prompt, responseFormat = "text") {
    console.log("📡 [GROQ SERVICE] Making API request to Groq...")
    console.log(`📝 [GROQ SERVICE] Prompt summary: ${prompt.substring(0, 100)}...`)
    console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

    const requestData = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: responseFormat === "json" ? 1000 : 4000,
      temperature: 0.7,
      top_p: 0.9,
    }

    if (responseFormat === "json") {
      requestData.response_format = { type: "json_object" }
    }

    console.log(
      `🔧 [GROQ SERVICE] Request config: Model=${this.model}, MaxTokens=${requestData.max_tokens}, Format=${responseFormat}`,
    )

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [GROQ SERVICE] Attempt ${attempt}/${this.maxRetries}`)

        const startTime = Date.now()
        const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.requestTimeout,
        })
        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`📈 [GROQ SERVICE] API Response Status: ${response.status}`)
        console.log(`⏱️ [GROQ SERVICE] Request duration: ${duration}ms`)

        if (response.data && response.data.choices && response.data.choices[0]) {
          const content = response.data.choices[0].message.content
          console.log(`📄 [GROQ SERVICE] Response content length: ${content.length} characters`)

          if (responseFormat === "json") {
            try {
              const parsed = JSON.parse(content)
              console.log("✅ [GROQ SERVICE] JSON response parsed successfully")
              return parsed
            } catch (parseError) {
              console.error("❌ [GROQ SERVICE] JSON parsing failed:", parseError.message)
              throw new Error("Invalid JSON response from API")
            }
          } else {
            return { content }
          }
        }

        throw new Error("No content in API response")
      } catch (error) {
        console.error(`❌ [GROQ SERVICE] Attempt ${attempt} failed:`, error.message)

        if (attempt === this.maxRetries) {
          throw error
        }

        const waitTime = attempt * 2000
        console.log(`⏳ [GROQ SERVICE] Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
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

Example structure:
<p>Introduction paragraph...</p>

<h2>Main Section Title</h2>
<p>Section content...</p>

<h3>Subsection Title</h3>
<p>Subsection content...</p>
<ul>
<li>Key point 1</li>
<li>Key point 2</li>
</ul>

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

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: "user", content: "Hello, this is a connection test." }],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      )

      console.log("✅ [GROQ SERVICE] Connection test successful")
      return {
        success: true,
        model: this.model,
        status: response.status,
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)

      const errorDetails = { error: error.message }
      if (error.response) {
        errorDetails.status = error.response.status
        errorDetails.statusText = error.response.statusText
      }

      return {
        success: false,
        fallbackAvailable: true,
        ...errorDetails,
      }
    }
  }

  generateExcerpt(content) {
    // Remove HTML tags and get first 160 characters
    const plainText = content
      .replace(/<[^>]*>/g, "")
      .replace(/\n+/g, " ")
      .trim()
    return plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText
  }

  extractTags(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const commonTags = [
      "technology",
      "ai",
      "business",
      "innovation",
      "news",
      "trending",
      "digital",
      "future",
      "market",
      "analysis",
      "breakthrough",
      "development",
    ]

    const foundTags = commonTags.filter((tag) => text.includes(tag))

    // Add title-based tags
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !["this", "that", "with", "from"].includes(word))

    foundTags.push(...titleWords.slice(0, 3))

    return [...new Set(foundTags)].slice(0, 6)
  }
}

module.exports = new GroqService()
