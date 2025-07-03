const axios = require("axios")

class UnsplashService {
  constructor() {
    this.apiKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.isInitialized = !!this.apiKey

    if (this.isInitialized) {
      console.log("✅ [UNSPLASH SERVICE] Initialized with API key")
    } else {
      console.log("⚠️ [UNSPLASH SERVICE] No API key found, using fallback mode")
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new Error("Unsplash API key not configured")
    }

    try {
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          count: 1,
        },
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
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

  async searchImage(query, options = {}) {
    console.log(`🖼️ [UNSPLASH SERVICE] Searching for image: "${query}"`)

    if (!this.isInitialized) {
      console.log("⚠️ [UNSPLASH SERVICE] Not initialized, using fallback")
      return this.getFallbackImage(query)
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query: query,
          per_page: 1,
          orientation: options.orientation || "landscape",
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
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

  async getRandomImage(category = "nature") {
    console.log(`🎲 [UNSPLASH SERVICE] Getting random image for category: "${category}"`)

    if (!this.isInitialized) {
      console.log("⚠️ [UNSPLASH SERVICE] Not initialized, using fallback")
      return this.getFallbackImage(category)
    }

    try {
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          query: category,
          orientation: "landscape",
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
        },
        timeout: 15000,
      })

      if (response.data && response.data.urls) {
        const imageUrl = response.data.urls.regular || response.data.urls.small
        console.log(`✅ [UNSPLASH SERVICE] Got random image for "${category}": ${imageUrl}`)
        return imageUrl
      } else {
        console.log(`⚠️ [UNSPLASH SERVICE] No random image found for "${category}", using fallback`)
        return this.getFallbackImage(category)
      }
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error getting random image for "${category}":`, error.message)
      return this.getFallbackImage(category)
    }
  }

  getFallbackImage(query) {
    // Generate a placeholder image URL based on the query
    const fallbackImages = {
      technology: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop",
      business: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
      health: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
      science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=400&fit=crop",
      entertainment: "https://images.unsplash.com/photo-1489599856641-b2d54d0b0b78?w=800&h=400&fit=crop",
      sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop",
      politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=400&fit=crop",
      world: "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=800&h=400&fit=crop",
      news: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop",
      default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop",
    }

    const queryLower = query.toLowerCase()
    let fallbackUrl = fallbackImages.default

    // Find matching category
    for (const [category, url] of Object.entries(fallbackImages)) {
      if (queryLower.includes(category)) {
        fallbackUrl = url
        break
      }
    }

    console.log(`🎭 [UNSPLASH SERVICE] Using fallback image for "${query}": ${fallbackUrl}`)
    return fallbackUrl
  }

  async getImagesByCollection(collectionId, count = 10) {
    if (!this.isInitialized) {
      console.log("⚠️ [UNSPLASH SERVICE] Not initialized, using fallback")
      return []
    }

    try {
      const response = await axios.get(`${this.baseUrl}/collections/${collectionId}/photos`, {
        params: {
          per_page: count,
        },
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
        },
        timeout: 15000,
      })

      if (response.data && Array.isArray(response.data)) {
        const images = response.data.map((photo) => ({
          id: photo.id,
          url: photo.urls.regular,
          thumbnail: photo.urls.thumb,
          description: photo.description || photo.alt_description,
          photographer: photo.user.name,
        }))

        console.log(`✅ [UNSPLASH SERVICE] Got ${images.length} images from collection ${collectionId}`)
        return images
      }

      return []
    } catch (error) {
      console.error(`❌ [UNSPLASH SERVICE] Error fetching collection ${collectionId}:`, error.message)
      return []
    }
  }
}

// Create singleton instance
const unsplashService = new UnsplashService()

module.exports = unsplashService
