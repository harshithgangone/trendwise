const axios = require("axios")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.requestTimeout = 10000
  }

  async searchImage(query, orientation = "landscape") {
    console.log(`[UNSPLASH SERVICE] Searching for image: "${query}" with orientation: ${orientation}`)

    if (!this.accessKey) {
      console.log("[UNSPLASH SERVICE] No access key provided, returning placeholder")
      return "/placeholder.svg?height=400&width=600"
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query: query,
          per_page: 1,
          orientation: orientation,
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "User-Agent": "TrendWise/1.0",
        },
        timeout: this.requestTimeout,
      })

      if (response.data && response.data.results && response.data.results.length > 0) {
        const photo = response.data.results[0]
        const imageUrl = photo.urls.regular || photo.urls.small
        console.log(`[UNSPLASH SERVICE] Found image: ${imageUrl}`)
        return imageUrl
      }

      console.log("[UNSPLASH SERVICE] No images found, returning placeholder")
      return "/placeholder.svg?height=400&width=600"
    } catch (error) {
      console.error(`[UNSPLASH SERVICE] Error searching for image "${query}":`, error.message)
      return "/placeholder.svg?height=400&width=600"
    }
  }

  async getRandomImage(category = "technology") {
    console.log(`[UNSPLASH SERVICE] Getting random image for category: ${category}`)

    if (!this.accessKey) {
      console.log("[UNSPLASH SERVICE] No access key provided, returning placeholder")
      return "/placeholder.svg?height=400&width=600"
    }

    try {
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          query: category,
          orientation: "landscape",
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "User-Agent": "TrendWise/1.0",
        },
        timeout: this.requestTimeout,
      })

      if (response.data && response.data.urls) {
        const imageUrl = response.data.urls.regular || response.data.urls.small
        console.log(`[UNSPLASH SERVICE] Found random image: ${imageUrl}`)
        return imageUrl
      }

      console.log("[UNSPLASH SERVICE] No random image found, returning placeholder")
      return "/placeholder.svg?height=400&width=600"
    } catch (error) {
      console.error(`[UNSPLASH SERVICE] Error getting random image for "${category}":`, error.message)
      return "/placeholder.svg?height=400&width=600"
    }
  }

  async testConnection() {
    console.log("[UNSPLASH SERVICE] Testing connection...")

    if (!this.accessKey) {
      return {
        success: false,
        error: "No access key configured",
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const response = await axios.get(`${this.baseUrl}/photos/random`, {
        params: {
          count: 1,
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "User-Agent": "TrendWise/1.0",
        },
        timeout: 5000,
      })

      return {
        success: true,
        status: response.status,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  getStatus() {
    return {
      accessKey: !!this.accessKey,
      baseUrl: this.baseUrl,
      timeout: this.requestTimeout,
    }
  }
}

module.exports = new UnsplashService()
