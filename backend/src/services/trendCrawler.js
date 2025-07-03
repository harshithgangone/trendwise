const axios = require("axios")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.isHealthy = false
    this.lastHealthCheck = null

    if (!this.accessKey) {
      console.warn("⚠️ [UNSPLASH SERVICE] No access key found, using placeholder images")
    } else {
      console.log(`🔑 [UNSPLASH SERVICE] Loaded access key: ${this.accessKey.substring(0, 8)}****`)
    }
  }

  async testConnection() {
    try {
      if (!this.accessKey) {
        console.log("🔧 [UNSPLASH SERVICE] No access key - using placeholder mode")
        this.isHealthy = true
        this.lastHealthCheck = new Date()
        return { status: "healthy", mode: "placeholder" }
      }

      console.log("🔍 [UNSPLASH SERVICE] Testing connection...")

      const response = await axios.get(`${this.baseUrl}/photos`, {
        params: {
          per_page: 1,
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.status === 200 && Array.isArray(response.data)) {
        this.isHealthy = true
        this.lastHealthCheck = new Date()
        console.log("✅ [UNSPLASH SERVICE] Connection test successful")
        return { status: "healthy", mode: "live" }
      } else {
        throw new Error(`Invalid response: ${response.status}`)
      }
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Connection test failed:", error.message)
      this.isHealthy = false
      this.lastHealthCheck = new Date()
      return { status: "unhealthy", error: error.message }
    }
  }

  async searchImage(query, options = {}) {
    try {
      if (!this.accessKey) {
        console.log(`🔧 [UNSPLASH SERVICE] Using placeholder for: ${query}`)
        return this.getPlaceholderImage(query)
      }

      console.log(`🖼️ [UNSPLASH SERVICE] Searching image for: "${query}"`)

      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query: query,
          per_page: options.count || 1,
          orientation: options.orientation || "landscape",
          content_filter: "high",
          order_by: "relevant",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.data && response.data.results && response.data.results.length > 0) {
        const image = response.data.results[0]
        const imageData = {
          id: image.id,
          url: image.urls.regular,
          thumbnail: image.urls.small,
          description: image.alt_description || query,
          photographer: image.user.name,
          photographerUrl: image.user.links.html,
          downloadUrl: image.links.download_location,
        }

        console.log(`✅ [UNSPLASH SERVICE] Found image by ${imageData.photographer}`)
        return imageData
      } else {
        console.log(`⚠️ [UNSPLASH SERVICE] No images found for "${query}", using placeholder`)
        return this.getPlaceholderImage(query)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Image search failed for "${query}":`, error.message)

      if (error.response?.status === 403) {
        console.error("🔑 [UNSPLASH SERVICE] Access key invalid or rate limit exceeded")
      }

      return this.getPlaceholderImage(query)
    }
  }

  async getRandomImage(category = "nature", options = {}) {
    try {
      if (!this.accessKey) {
        return this.getPlaceholderImage(category)
      }

      console.log(`🎲 [UNSPLASH SERVICE] Getting random image for category: ${category}`)

      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          query: category,
          orientation: options.orientation || "landscape",
          content_filter: "high",
          count: 1,
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.data) {
        const image = Array.isArray(response.data) ? response.data[0] : response.data

        const imageData = {
          id: image.id,
          url: image.urls.regular,
          thumbnail: image.urls.small,
          description: image.alt_description || category,
          photographer: image.user.name,
          photographerUrl: image.user.links.html,
          downloadUrl: image.links.download_location,
        }

        console.log(`✅ [UNSPLASH SERVICE] Got random image by ${imageData.photographer}`)
        return imageData
      } else {
        return this.getPlaceholderImage(category)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Random image fetch failed:`, error.message)
      return this.getPlaceholderImage(category)
    }
  }

  getPlaceholderImage(query) {
    const width = 800
    const height = 600
    const encodedQuery = encodeURIComponent(query)

    // Use a variety of placeholder services
    const placeholderServices = [
      `https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=${width}&h=${height}&fit=crop`,
      `https://images.unsplash.com/photo-1557804506-669a67965ba0?w=${width}&h=${height}&fit=crop`,
      `https://images.unsplash.com/photo-1551434678-e076c223a692?w=${width}&h=${height}&fit=crop`,
      `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=${width}&h=${height}&fit=crop`,
      `https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=${width}&h=${height}&fit=crop`,
    ]

    const randomIndex = Math.floor(Math.random() * placeholderServices.length)
    const placeholderUrl = placeholderServices[randomIndex]

    console.log(`🎭 [UNSPLASH SERVICE] Generated placeholder for: ${query}`)

    return {
      id: `placeholder-${Date.now()}`,
      url: placeholderUrl,
      thumbnail: placeholderUrl,
      description: `Placeholder image for ${query}`,
      photographer: "Unsplash",
      photographerUrl: "https://unsplash.com",
      downloadUrl: null,
      isPlaceholder: true,
    }
  }

  async downloadImage(downloadUrl) {
    try {
      if (!this.accessKey || !downloadUrl) {
        return null
      }

      await axios.get(downloadUrl, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 5000,
      })

      console.log("📥 [UNSPLASH SERVICE] Image download tracked")
      return true
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Download tracking failed:", error.message)
      return false
    }
  }

  getImageForCategory(category) {
    const categoryMappings = {
      technology: "computer technology",
      business: "business office",
      health: "medical health",
      science: "laboratory science",
      politics: "government politics",
      sports: "sports action",
      entertainment: "entertainment media",
      general: "news media",
      breaking: "breaking news",
      world: "world news",
    }

    const searchQuery = categoryMappings[category.toLowerCase()] || category
    return this.searchImage(searchQuery)
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      hasAccessKey: !!this.accessKey,
      service: "Unsplash",
    }
  }
}

// Create singleton instance
const unsplashService = new UnsplashService()

module.exports = unsplashService
