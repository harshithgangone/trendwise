const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.client = null
    this.isHealthy = false
    this.lastHealthCheck = null
    this.init()
  }

  init() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.warn("⚠️ [GROQ] API key not found, service will be disabled")
        return
      }

      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      })

      console.log("✅ [GROQ] Service initialized successfully")
    } catch (error) {
      console.error("❌ [GROQ] Failed to initialize:", error)
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        this.isHealthy = false
        return false
      }

      // Simple test to check if the service is working
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama3-8b-8192",
        max_tokens: 10,
      })

      this.isHealthy = !!response
      this.lastHealthCheck = new Date()
      return this.isHealthy
    } catch (error) {
      console.error("❌ [GROQ] Health check failed:", error)
      this.isHealthy = false
      return false
    }
  }

  async generateArticle(topic, category = "general") {
    try {
      if (!this.client) {
        console.warn("⚠️ [GROQ] Client not initialized, returning mock content")
        return this.getMockArticle(topic, category)
      }

      const prompt = `Write a comprehensive news article about "${topic}" in the ${category} category. 
      
      Requirements:
      - Write a compelling headline
      - Include a brief summary/excerpt
      - Write detailed content with multiple paragraphs
      - Make it informative and engaging
      - Include relevant context and background
      - Format as JSON with: title, excerpt, content, category, tags
      
      Topic: ${topic}
      Category: ${category}`

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional journalist writing high-quality news articles. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        max_tokens: 2000,
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content generated")
      }

      // Try to parse JSON response
      try {
        const articleData = JSON.parse(content)
        return {
          title: articleData.title || `Breaking: ${topic}`,
          excerpt: articleData.excerpt || `Latest developments in ${topic}`,
          content: articleData.content || content,
          category: articleData.category || category,
          tags: articleData.tags || [category, topic],
          source: "AI Generated",
          publishedAt: new Date(),
        }
      } catch (parseError) {
        // If JSON parsing fails, use the raw content
        return {
          title: `Breaking: ${topic}`,
          excerpt: `Latest developments in ${topic}`,
          content: content,
          category: category,
          tags: [category, topic],
          source: "AI Generated",
          publishedAt: new Date(),
        }
      }
    } catch (error) {
      console.error("❌ [GROQ] Failed to generate article:", error)
      return this.getMockArticle(topic, category)
    }
  }

  getMockArticle(topic, category) {
    const mockArticles = {
      technology: {
        title: `Revolutionary Breakthrough in ${topic}`,
        excerpt: `Scientists and engineers have made significant progress in ${topic}, marking a new era in technological advancement.`,
        content: `In a groundbreaking development, researchers have announced major advancements in ${topic}. This breakthrough promises to revolutionize how we approach technology and innovation.

        The development comes after months of intensive research and testing. Industry experts believe this could be a game-changer for the ${category} sector.

        Key highlights include improved efficiency, enhanced user experience, and potential cost reductions. The implications of this advancement extend beyond immediate applications.

        Researchers are optimistic about the future applications of this technology. Further studies are planned to explore additional possibilities and refinements.

        The announcement has generated significant interest from both industry professionals and the general public, highlighting the importance of continued innovation in the ${category} field.`,
      },
      business: {
        title: `Market Analysis: ${topic} Shows Strong Growth`,
        excerpt: `Recent market data indicates significant growth in ${topic}, with analysts predicting continued expansion.`,
        content: `Market analysts are reporting strong performance in ${topic}, with indicators showing sustained growth across multiple sectors.

        The positive trend reflects broader economic conditions and consumer confidence. Industry leaders attribute this growth to several key factors including innovation, market demand, and strategic investments.

        Financial experts suggest that this growth pattern could continue throughout the coming quarters. The ${category} sector has shown remarkable resilience and adaptability.

        Investors are taking notice of these developments, with increased activity in related markets. The long-term outlook remains positive according to leading economic forecasters.

        This growth in ${topic} represents broader trends in the ${category} industry and suggests continued opportunities for expansion and development.`,
      },
      default: {
        title: `Latest Updates on ${topic}`,
        excerpt: `Stay informed with the latest developments and insights about ${topic}.`,
        content: `Recent developments in ${topic} have captured widespread attention, highlighting important trends and changes in the ${category} sector.

        Experts are closely monitoring the situation and providing analysis on potential implications. The developments represent significant changes that could impact various stakeholders.

        Key aspects of this story include evolving circumstances, expert opinions, and potential future developments. The situation continues to develop with new information emerging regularly.

        Stakeholders are advised to stay informed as the situation progresses. The implications of these developments extend beyond immediate concerns.

        This ongoing story in ${topic} reflects broader trends in the ${category} field and demonstrates the importance of staying current with emerging developments.`,
      },
    }

    const template = mockArticles[category] || mockArticles.default
    return {
      ...template,
      category: category,
      tags: [category, topic],
      source: "Mock Data",
      publishedAt: new Date(),
    }
  }

  getStatus() {
    return {
      initialized: !!this.client,
      healthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      hasApiKey: !!process.env.GROQ_API_KEY,
    }
  }
}

module.exports = new GroqService()
