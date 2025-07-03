const axios = require("axios")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.isHealthy = false
    this.lastError = null

    if (!this.accessKey) {
      console.warn("⚠️ [UNSPLASH SERVICE] No access key found")
      this.lastError = "No access key configured"
    } else {
      console.log(`✅ [UNSPLASH SERVICE] Loaded UNSPLASH_ACCESS_KEY: ${this.accessKey.substring(0, 6)}****`)
    }
  }

  async testConnection() {
    try {
      console.log("🔍 [UNSPLASH SERVICE] Testing connection...")

      if (!this.accessKey) {
        throw new Error("No access key configured")
      }

      const response = await axios.get(`${this.baseUrl}/photos`, {
        params: {
          per_page: 1,
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.data && Array.isArray(response.data)) {
        this.isHealthy = true
        this.lastError = null
        console.log("✅ [UNSPLASH SERVICE] Connection test successful")
        return true
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      this.isHealthy = false
      this.lastError = error.message
      console.error("❌ [UNSPLASH SERVICE] Connection test failed:", error.message)
      return false
    }
  }

  async searchImage(query, options = {}) {
    try {
      console.log(`🖼️ [UNSPLASH SERVICE] Searching images for: "${query}"`)

      if (!this.accessKey) {
        console.warn("⚠️ [UNSPLASH SERVICE] No access key, using placeholder")
        return this.getPlaceholderImage(query)
      }

      const params = {
        query: query,
        per_page: options.count || 1,
        orientation: options.orientation || "landscape",
        content_filter: "high",
      }

      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params,
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.data && response.data.results && response.data.results.length > 0) {
        const image = response.data.results[0]

        console.log(`✅ [UNSPLASH SERVICE] Found image for "${query}": ${image.urls.regular}`)

        return {
          success: true,
          image: {
            url: image.urls.regular,
            thumbnail: image.urls.thumb,
            alt: image.alt_description || query,
            photographer: image.user.name,
            photographerUrl: image.user.links.html,
            downloadUrl: image.links.download_location,
          },
        }
      } else {
        console.warn(`⚠️ [UNSPLASH SERVICE] No images found for "${query}", using placeholder`)
        return this.getPlaceholderImage(query)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error searching for "${query}":`, error.message)
      return this.getPlaceholderImage(query)
    }
  }

  getPlaceholderImage(query) {
    const width = 800
    const height = 400
    const encodedQuery = encodeURIComponent(query)

    return {
      success: true,
      image: {
        url: `/placeholder.svg?height=${height}&width=${width}&text=${encodedQuery}`,
        thumbnail: `/placeholder.svg?height=200&width=300&text=${encodedQuery}`,
        alt: query,
        photographer: "Placeholder",
        photographerUrl: "#",
        downloadUrl: null,
      },
    }
  }

  async getRandomImage(category = "news") {
    try {
      console.log(`🎲 [UNSPLASH SERVICE] Getting random image for category: "${category}"`)

      if (!this.accessKey) {
        return this.getPlaceholderImage(category)
      }

      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          query: category,
          orientation: "landscape",
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      if (response.data && response.data.urls) {
        const image = response.data

        console.log(`✅ [UNSPLASH SERVICE] Got random image: ${image.urls.regular}`)

        return {
          success: true,
          image: {
            url: image.urls.regular,
            thumbnail: image.urls.thumb,
            alt: image.alt_description || category,
            photographer: image.user.name,
            photographerUrl: image.user.links.html,
            downloadUrl: image.links.download_location,
          },
        }
      } else {
        return this.getPlaceholderImage(category)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error getting random image:`, error.message)
      return this.getPlaceholderImage(category)
    }
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastError: this.lastError,
      hasApiKey: !!this.accessKey,
      service: "Unsplash",
    }
  }
}

// Create singleton instance
const unsplashService = new UnsplashService()

module.exports = unsplashService
