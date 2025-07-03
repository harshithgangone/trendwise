const axios = require("axios")
require("dotenv").config()

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseUrl = "https://api.unsplash.com"
    this.requestTimeout = 10000
  }

  async searchImage(query, orientation = "landscape") {
    console.log(`🖼️ [UNSPLASH SERVICE] Searching for image: "${query}"`)

    if (!this.accessKey) {
      console.log("⚠️ [UNSPLASH SERVICE] No access key configured, using placeholder")
      return "/placeholder.svg?height=400&width=600"
    }

    try {
      const cleanQuery = this.cleanQuery(query)
      console.log(`🔍 [UNSPLASH SERVICE] Clean query: "${cleanQuery}"`)

      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        params: {
          query: cleanQuery,
          per_page: 5,
          orientation: orientation,
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "User-Agent": "TrendWise/1.0",
        },
        timeout: this.requestTimeout,
      })

      console.log(`📊 [UNSPLASH SERVICE] API response status: ${response.status}`)

      if (response.data && response.data.results && response.data.results.length > 0) {
        const photo = response.data.results[0]
        const imageUrl = photo.urls.regular || photo.urls.small

        console.log(`✅ [UNSPLASH SERVICE] Found image: ${imageUrl}`)
        return imageUrl
      }

      console.log("⚠️ [UNSPLASH SERVICE] No images found, using placeholder")
      return "/placeholder.svg?height=400&width=600"
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Error searching for image:", error.message)

      if (error.response) {
        console.error(`📊 [UNSPLASH SERVICE] API Error Status: ${error.response.status}`)
        console.error(`📊 [UNSPLASH SERVICE] API Error Data:`, error.response.data)
      }

      return "/placeholder.svg?height=400&width=600"
    }
  }

  cleanQuery(query) {
    // Remove special characters and limit length
    return query
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100)
      .split(" ")
      .slice(0, 3) // Limit to 3 words for better results
      .join(" ")
  }

  async testConnection() {
    console.log("🔧 [UNSPLASH SERVICE] Testing connection...")

    if (!this.accessKey) {
      console.log("⚠️ [UNSPLASH SERVICE] No access key configured")
      return {
        success: false,
        error: "No access key configured",
        fallbackAvailable: true,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      console.log("📡 [UNSPLASH SERVICE] Testing API connection...")
      console.log(`🔑 [UNSPLASH SERVICE] Using access key: ${this.accessKey.substring(0, 8)}...`)

      const startTime = Date.now()
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
      const endTime = Date.now()

      console.log("✅ [UNSPLASH SERVICE] Connection test successful")
      console.log(`⏱️ [UNSPLASH SERVICE] Response time: ${endTime - startTime}ms`)

      return {
        success: true,
        status: response.status,
        responseTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Connection test failed:", error.message)

      const errorDetails = {
        success: false,
        error: error.message,
        fallbackAvailable: true,
        timestamp: new Date().toISOString(),
      }

      if (error.response) {
        errorDetails.status = error.response.status
        errorDetails.statusText = error.response.statusText
        console.error(`📊 [UNSPLASH SERVICE] API Error Status: ${error.response.status} - ${error.response.statusText}`)
        console.error(`📊 [UNSPLASH SERVICE] API Error Data: ${JSON.stringify(error.response.data || {})}`)

        if (error.response.status === 401) {
          console.error("🔑 [UNSPLASH SERVICE] Authentication failed - check access key")
          errorDetails.authError = true
        }
      }

      return errorDetails
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

// Create and export singleton instance
const unsplashService = new UnsplashService()
module.exports = unsplashService
