const axios = require("axios")
const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.client = null
    this.isInitialized = false
    this.apiKey = process.env.GROQ_API_KEY

    if (this.apiKey) {
      try {
        this.client = new Groq({
          apiKey: this.apiKey,
        })
        this.isInitialized = true
        console.log("✅ [GROQ SERVICE] Initialized successfully")
      } catch (error) {
        console.error("❌ [GROQ SERVICE] Failed to initialize:", error.message)
      }
    } else {
      console.log("⚠️ [GROQ SERVICE] No API key found, using fallback mode")
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new Error("Groq service not initialized")
    }

    try {
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama3-8b-8192",
        max_tokens: 10,
      })

      console.log("✅ [GROQ SERVICE] Connection test successful")
      return true
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)
      throw error
    }
  }

  async generateArticle(newsItem) {
    console.log(`🤖 [GROQ SERVICE] Generating article for: "${newsItem.title}"`)

    if (!this.isInitialized) {
      console.log("⚠️ [GROQ SERVICE] Not initialized, using fallback")
      return this.generateFallbackArticle(newsItem)
    }

    try {
      const prompt = `Transform this news into a comprehensive, engaging article:

Title: ${newsItem.title}
Description: ${newsItem.description}
Content: ${newsItem.content || newsItem.description}
Source: ${newsItem.source?.name || "Unknown"}

Create a well-structured article with:
1. An engaging title (different from the original)
2. A compelling excerpt (2-3 sentences)
3. Full article content (800-1200 words)
4. 3-5 relevant tags
5. A category
6. Estimated read time

Format as JSON:
{
  "title": "engaging title here",
  "excerpt": "compelling excerpt here",
  "content": "full article content with proper paragraphs",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name",
  "readTime": 5
}`

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional journalist and content creator. Create engaging, informative articles that are well-structured and easy to read. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-8b-8192",
        max_tokens: 2000,
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content generated")
      }

      try {
        const article = JSON.parse(content)
        console.log("✅ [GROQ SERVICE] Article generated successfully")
        return {
          ...article,
          thumbnail: newsItem.image || "/placeholder.svg?height=400&width=600",
          source: newsItem.source?.name || "TrendWise",
          originalUrl: newsItem.url,
        }
      } catch (parseError) {
        console.log("⚠️ [GROQ SERVICE] Failed to parse JSON, using fallback")
        return this.generateFallbackArticle(newsItem)
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Error generating article:", error.message)
      return this.generateFallbackArticle(newsItem)
    }
  }

  generateFallbackArticle(newsItem) {
    console.log("🔄 [GROQ SERVICE] Generating fallback article")

    const title = newsItem.title || "Breaking News Update"
    const description = newsItem.description || "Stay informed with the latest developments."

    // Generate content based on available information
    let content = `<h2>${title}</h2>\n\n`
    content += `<p>${description}</p>\n\n`

    if (newsItem.content && newsItem.content.length > 200) {
      // Use the provided content
      const paragraphs = newsItem.content.split("\n").filter((p) => p.trim().length > 0)
      paragraphs.forEach((paragraph) => {
        content += `<p>${paragraph.trim()}</p>\n\n`
      })
    } else {
      // Generate additional content
      content += `<p>This story continues to develop as more information becomes available. Our team is monitoring the situation closely and will provide updates as they emerge.</p>\n\n`
      content += `<p>The implications of this development are significant and may have far-reaching effects across various sectors. Experts are analyzing the situation to better understand the potential outcomes.</p>\n\n`
      content += `<p>We encourage our readers to stay informed through reliable sources and to check back for the latest updates on this evolving story.</p>\n\n`
    }

    // Add source attribution
    if (newsItem.source?.name) {
      content += `<p><em>Source: ${newsItem.source.name}</em></p>`
    }

    // Generate tags based on title and content
    const tags = this.generateTags(title + " " + description)

    // Determine category
    const category = this.determineCategory(title + " " + description)

    // Calculate read time
    const wordCount = content.replace(/<[^>]*>/g, "").split(" ").length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    return {
      title: title,
      excerpt: description.length > 200 ? description.substring(0, 200) + "..." : description,
      content: content,
      tags: tags,
      category: category,
      readTime: readTime,
      thumbnail: newsItem.image || "/placeholder.svg?height=400&width=600",
      source: newsItem.source?.name || "TrendWise",
      originalUrl: newsItem.url,
    }
  }

  generateTags(text) {
    const commonTags = [
      "breaking news",
      "technology",
      "business",
      "politics",
      "health",
      "science",
      "entertainment",
      "sports",
      "world news",
      "economy",
      "innovation",
      "trending",
      "analysis",
      "update",
      "development",
      "research",
      "market",
      "global",
    ]

    const textLower = text.toLowerCase()
    const relevantTags = commonTags.filter((tag) => textLower.includes(tag) || textLower.includes(tag.split(" ")[0]))

    // Add some random relevant tags if we don't have enough
    while (relevantTags.length < 3) {
      const randomTag = commonTags[Math.floor(Math.random() * commonTags.length)]
      if (!relevantTags.includes(randomTag)) {
        relevantTags.push(randomTag)
      }
    }

    return relevantTags.slice(0, 5)
  }

  determineCategory(text) {
    const categories = {
      technology: ["tech", "ai", "software", "digital", "computer", "internet", "app"],
      business: ["business", "economy", "market", "finance", "company", "corporate"],
      politics: ["politics", "government", "election", "policy", "congress", "senate"],
      health: ["health", "medical", "doctor", "hospital", "disease", "treatment"],
      science: ["science", "research", "study", "discovery", "experiment", "scientist"],
      entertainment: ["entertainment", "movie", "music", "celebrity", "film", "show"],
      sports: ["sports", "game", "team", "player", "match", "championship"],
      world: ["world", "international", "global", "country", "nation", "foreign"],
    }

    const textLower = text.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        return category.charAt(0).toUpperCase() + category.slice(1)
      }
    }

    return "General"
  }

  async generateSummary(text, maxLength = 200) {
    if (!this.isInitialized) {
      // Fallback summary generation
      const sentences = text.split(".").filter((s) => s.trim().length > 0)
      const summary = sentences.slice(0, 2).join(".") + "."
      return summary.length > maxLength ? summary.substring(0, maxLength) + "..." : summary
    }

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a professional editor. Create concise, engaging summaries.",
          },
          {
            role: "user",
            content: `Summarize this text in ${maxLength} characters or less:\n\n${text}`,
          },
        ],
        model: "llama3-8b-8192",
        max_tokens: 100,
        temperature: 0.5,
      })

      return response.choices[0]?.message?.content || text.substring(0, maxLength) + "..."
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Error generating summary:", error.message)
      return text.substring(0, maxLength) + "..."
    }
  }
}

// Create singleton instance
const groqService = new GroqService()

module.exports = { groqService }
