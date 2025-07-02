const { Groq } = require("groq-sdk")

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

  async generateArticle(topic, category = "Technology") {
    if (!this.client) {
      console.log("🔄 [GROQ] Using fallback content generation...")
      return this.generateFallbackArticle(topic, category)
    }

    try {
      console.log(`🤖 [GROQ] Generating article for topic: ${topic}`)

      const prompt = `Write a comprehensive, engaging article about "${topic}" in the ${category} category. 

Requirements:
- Write in a professional, informative tone
- Include practical insights and real-world applications
- Structure with clear headings and subheadings
- Make it 800-1200 words
- Include actionable takeaways
- Write in Markdown format
- Focus on current trends and future implications

Format the response as a JSON object with these fields:
{
  "title": "Compelling article title",
  "excerpt": "Brief 2-3 sentence summary",
  "content": "Full article content in Markdown",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "readTime": estimated_read_time_in_minutes
}`

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an expert content writer specializing in technology, business, and innovation topics. Create engaging, informative articles that provide real value to readers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 4000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error("No response from Groq API")
      }

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from Groq")
      }

      const articleData = JSON.parse(jsonMatch[0])

      console.log(`✅ [GROQ] Successfully generated article: ${articleData.title}`)

      return {
        title: articleData.title,
        slug: this.generateSlug(articleData.title),
        excerpt: articleData.excerpt,
        content: articleData.content,
        tags: articleData.tags || [topic, category],
        readTime: articleData.readTime || 5,
        category: category,
        thumbnail: `/placeholder.svg?height=400&width=600`,
        author: "TrendBot AI",
        status: "published",
        featured: Math.random() > 0.7,
        views: Math.floor(Math.random() * 1000) + 100,
        likes: Math.floor(Math.random() * 50) + 10,
        saves: Math.floor(Math.random() * 20) + 5,
      }
    } catch (error) {
      console.error("❌ [GROQ] Error generating article:", error.message)
      return this.generateFallbackArticle(topic, category)
    }
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 100)
  }

  generateFallbackArticle(topic, category) {
    console.log(`🔄 [GROQ] Generating fallback article for: ${topic}`)

    const fallbackContent = `# ${topic}: A Comprehensive Overview

${topic} is rapidly transforming the ${category.toLowerCase()} landscape, bringing unprecedented opportunities and challenges.

## Current State of ${topic}

The field of ${topic} has evolved significantly in recent years, with major breakthroughs and innovations reshaping how we approach traditional problems.

## Key Developments

### Innovation and Technology
Recent advances in ${topic} have opened new possibilities for businesses and individuals alike.

### Market Impact
The economic implications of ${topic} are far-reaching, affecting multiple industries and sectors.

### Future Outlook
Looking ahead, ${topic} is expected to continue its rapid evolution, with experts predicting significant developments in the coming years.

## Practical Applications

${topic} is being applied in various real-world scenarios, demonstrating its versatility and potential impact.

## Challenges and Opportunities

While ${topic} presents exciting opportunities, it also comes with challenges that need to be addressed.

## Conclusion

${topic} represents a significant shift in the ${category.toLowerCase()} sector, offering both opportunities and challenges for stakeholders.

## Key Takeaways

- ${topic} is transforming the ${category.toLowerCase()} industry
- Multiple applications are emerging across different sectors
- Future developments promise even greater impact
- Stakeholders should prepare for continued evolution`

    return {
      title: `${topic}: Transforming ${category} in 2024`,
      slug: this.generateSlug(`${topic}: Transforming ${category} in 2024`),
      excerpt: `Explore how ${topic} is revolutionizing the ${category.toLowerCase()} sector with innovative solutions and breakthrough technologies.`,
      content: fallbackContent,
      tags: [topic, category, "Innovation", "Technology"],
      readTime: 6,
      category: category,
      thumbnail: `/placeholder.svg?height=400&width=600`,
      author: "TrendBot AI",
      status: "published",
      featured: Math.random() > 0.7,
      views: Math.floor(Math.random() * 1000) + 100,
      likes: Math.floor(Math.random() * 50) + 10,
      saves: Math.floor(Math.random() * 20) + 5,
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
