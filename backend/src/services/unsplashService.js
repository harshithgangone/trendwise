const axios = require("axios")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.isInitialized = !!this.accessKey

    if (this.isInitialized) {
      console.log("✅ [UNSPLASH SERVICE] Initialized with access key")
    } else {
      console.log("⚠️ [UNSPLASH SERVICE] No access key found, using fallback mode")
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new Error("Unsplash access key not configured")
    }

    try {
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          client_id: this.accessKey,
          count: 1,
        },
        timeout: 10000,
      })

      if (response.data && Array.isArray(response.data)) {
        console.log("✅ [UNSPLASH SERVICE] Connection test successful")
        return true
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Connection test failed:", error.message)
      throw error
    }
  }

  async searchImage(query, orientation = "landscape") {
    if (!this.isInitialized) {
      console.log("⚠️ [UNSPLASH SERVICE] API not initialized, using fallback")
      return this.getFallbackImage(query)
    }

    try {
      console.log(`🖼️ [UNSPLASH SERVICE] Searching for image: "${query}"`)

      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          client_id: this.accessKey,
          query: query,
          per_page: 1,
          orientation: orientation,
          content_filter: "high",
        },
        timeout: 15000,
      })

      if (response.data && response.data.results && response.data.results.length > 0) {
        const photo = response.data.results[0]
        const imageUrl = photo.urls.regular || photo.urls.small

        console.log(`✅ [UNSPLASH SERVICE] Found image for "${query}": ${imageUrl}`)
        return imageUrl
      } else {
        console.log(`⚠️ [UNSPLASH SERVICE] No images found for "${query}", using fallback`)
        return this.getFallbackImage(query)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error searching for "${query}":`, error.message)
      return this.getFallbackImage(query)
    }
  }

  async getRandomImage(category = "news") {
    if (!this.isInitialized) {
      return this.getFallbackImage(category)
    }

    try {
      console.log(`🎲 [UNSPLASH SERVICE] Getting random image for category: "${category}"`)

      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          client_id: this.accessKey,
          query: category,
          orientation: "landscape",
          content_filter: "high",
        },
        timeout: 15000,
      })

      if (response.data && response.data.urls) {
        const imageUrl = response.data.urls.regular || response.data.urls.small
        console.log(`✅ [UNSPLASH SERVICE] Got random image: ${imageUrl}`)
        return imageUrl
      } else {
        return this.getFallbackImage(category)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error getting random image:`, error.message)
      return this.getFallbackImage(category)
    }
  }

  getFallbackImage(query = "news") {
    // Generate a placeholder image URL based on the query
    const width = 800
    const height = 400
    const backgroundColor = this.getColorFromQuery(query)
    const textColor = "ffffff"

    const fallbackUrl = `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${encodeURIComponent(query)}`

    console.log(`🖼️ [UNSPLASH SERVICE] Using fallback image for "${query}": ${fallbackUrl}`)
    return fallbackUrl
  }

  getColorFromQuery(query) {
    // Generate a consistent color based on the query string
    const colors = [
      "3498db", // Blue
      "2ecc71", // Green
      "e74c3c", // Red
      "f39c12", // Orange
      "9b59b6", // Purple
      "1abc9c", // Turquoise
      "34495e", // Dark Blue
      "95a5a6", // Gray
    ]

    let hash = 0
    for (let i = 0; i < query.length; i++) {
      hash = query.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % colors.length
    return colors[index]
  }
}

// Create singleton instance
const unsplashService = new UnsplashService()

module.exports = { unsplashService }
