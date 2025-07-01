const axios = require("axios")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || "demo_key"
    this.baseURL = "https://api.unsplash.com"
  }

  async searchImages(query, count = 3) {
    try {
      console.log(`🖼️ [UNSPLASH] Searching for images: "${query}" (count: ${count})`)

      if (this.accessKey === "demo_key") {
        console.log("⚠️ [UNSPLASH] Using demo key - returning placeholder images")
        return this.generatePlaceholderImages(count)
      }

      const response = await axios.get(`${this.baseURL}/search/photos`, {
        params: {
          query: query,
          per_page: count,
          orientation: "landscape",
          content_filter: "high",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: 10000,
      })

      const images = response.data.results.map((photo) => ({
        url: photo.urls.regular,
        thumbnail: photo.urls.small,
        alt: photo.alt_description || query,
        photographer: photo.user.name,
        source: "unsplash",
      }))

      console.log(`✅ [UNSPLASH] Successfully retrieved ${images.length} images for "${query}"`)
      return images.map((img) => img.url)
    } catch (error) {
      console.error(`❌ [UNSPLASH] Error fetching images for "${query}":`, error.message)
      console.log(`🔄 [UNSPLASH] Falling back to placeholder images`)
      return this.generatePlaceholderImages(count)
    }
  }

  generatePlaceholderImages(count) {
    const placeholders = []
    for (let i = 0; i < count; i++) {
      placeholders.push(`/placeholder.svg?height=400&width=600&text=Image${i + 1}`)
    }
    console.log(`📷 [UNSPLASH] Generated ${count} placeholder images`)
    return placeholders
  }

  async getFeaturedImage(query) {
    try {
      console.log(`🌟 [UNSPLASH] Getting featured image for: "${query}"`)
      const images = await this.searchImages(query, 1)
      return images[0] || "/placeholder.svg?height=400&width=600"
    } catch (error) {
      console.error(`❌ [UNSPLASH] Error getting featured image:`, error.message)
      return "/placeholder.svg?height=400&width=600"
    }
  }
}

module.exports = new UnsplashService()
