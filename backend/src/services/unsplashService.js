const axios = require("axios")
const fetch = require("node-fetch")

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY
    this.baseURL = "https://api.unsplash.com"
    this.requestTimeout = 10000
    this.maxRetries = 2
    console.log("📸 [UNSPLASH] Service initialized")
  }

  async searchImages(query, count = 3) {
    console.log("🖼️ [UNSPLASH SERVICE] Starting image search...")
    console.log(`🔍 [UNSPLASH SERVICE] Query: "${query}", Count: ${count}`)
    console.log(`🔑 [UNSPLASH SERVICE] Access Key: ${this.accessKey ? "Present" : "Missing"}`)

    if (!this.accessKey) {
      console.log("⚠️ [UNSPLASH SERVICE] No access key, using placeholder images")
      return this.generatePlaceholderImages(query, count)
    }

    try {
      console.log("📡 [UNSPLASH SERVICE] Making API request...")

      const response = await axios.get(`${this.baseURL}/search/photos`, {
        params: {
          query: query,
          per_page: count,
          orientation: "landscape",
          content_filter: "high",
          order_by: "relevant",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "Accept-Version": "v1",
        },
        timeout: this.requestTimeout,
      })

      console.log(`📈 [UNSPLASH SERVICE] API Response Status: ${response.status}`)
      console.log(`📊 [UNSPLASH SERVICE] Images found: ${response.data.results?.length || 0}`)

      if (response.data && response.data.results && response.data.results.length > 0) {
        const images = response.data.results.map((photo, index) => {
          console.log(`🖼️ [UNSPLASH SERVICE] Processing image ${index + 1}: ${photo.id}`)

          return {
            id: photo.id,
            url: photo.urls.regular,
            thumbnail: photo.urls.small,
            alt: photo.alt_description || photo.description || query,
            width: photo.width,
            height: photo.height,
            photographer: {
              name: photo.user.name,
              username: photo.user.username,
              profile: photo.user.links.html,
            },
            downloadUrl: photo.links.download,
            unsplashUrl: photo.links.html,
            color: photo.color,
            likes: photo.likes,
          }
        })

        console.log(`✅ [UNSPLASH SERVICE] Successfully processed ${images.length} images`)
        return images
      }

      console.log("⚠️ [UNSPLASH SERVICE] No images found, using placeholders")
      return this.generatePlaceholderImages(query, count)
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Image search failed:", error.message)

      if (error.response) {
        console.error(`📊 [UNSPLASH SERVICE] API Error Status: ${error.response.status}`)
        console.error(`📊 [UNSPLASH SERVICE] API Error Data:`, error.response.data)
      }

      console.log("🔄 [UNSPLASH SERVICE] Falling back to placeholder images")
      return this.generatePlaceholderImages(query, count)
    }
  }

  async searchPhotos(query, count = 1) {
    if (!this.accessKey) {
      console.warn("⚠️ [UNSPLASH] Access key not found, returning placeholder")
      return this.getPlaceholderImages(query, count)
    }

    try {
      console.log(`🔍 [UNSPLASH] Searching for "${query}" images...`)

      const response = await axios.get(`${this.baseURL}/search/photos`, {
        params: {
          query,
          per_page: count,
          orientation: "landscape",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
        timeout: this.requestTimeout,
      })

      if (response.data && response.data.results) {
        const images = response.data.results.map((photo) => ({
          id: photo.id,
          url: photo.urls.regular,
          thumbnail: photo.urls.small,
          alt: photo.alt_description || query,
          author: photo.user.name,
          authorUrl: photo.user.links.html,
          downloadUrl: photo.links.download_location,
        }))

        console.log(`✅ [UNSPLASH] Found ${images.length} images`)
        return images
      }

      throw new Error("Invalid response from Unsplash API")
    } catch (error) {
      console.error("❌ [UNSPLASH] Error searching photos:", error.message)
      return this.getPlaceholderImages(query, count)
    }
  }

  async getRandomImages(count = 5) {
    console.log("🎲 [UNSPLASH SERVICE] Fetching random images...")
    console.log(`📊 [UNSPLASH SERVICE] Count: ${count}`)

    if (!this.accessKey) {
      console.log("⚠️ [UNSPLASH SERVICE] No access key, using placeholder images")
      return this.generatePlaceholderImages("random", count)
    }

    try {
      console.log("📡 [UNSPLASH SERVICE] Making random images API request...")

      const response = await axios.get(`${this.baseURL}/photos/random`, {
        params: {
          count: count,
          orientation: "landscape",
          content_filter: "high",
          topics: "technology,business,nature",
        },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "Accept-Version": "v1",
        },
        timeout: this.requestTimeout,
      })

      console.log(`📈 [UNSPLASH SERVICE] Random API Response Status: ${response.status}`)

      const photos = Array.isArray(response.data) ? response.data : [response.data]
      console.log(`📊 [UNSPLASH SERVICE] Random images received: ${photos.length}`)

      const images = photos.map((photo, index) => {
        console.log(`🖼️ [UNSPLASH SERVICE] Processing random image ${index + 1}: ${photo.id}`)

        return {
          id: photo.id,
          url: photo.urls.regular,
          thumbnail: photo.urls.small,
          alt: photo.alt_description || photo.description || "Random image",
          width: photo.width,
          height: photo.height,
          photographer: {
            name: photo.user.name,
            username: photo.user.username,
            profile: photo.user.links.html,
          },
          downloadUrl: photo.links.download,
          unsplashUrl: photo.links.html,
          color: photo.color,
          likes: photo.likes,
        }
      })

      console.log(`✅ [UNSPLASH SERVICE] Successfully processed ${images.length} random images`)
      return images
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Random images fetch failed:", error.message)

      if (error.response) {
        console.error(`📊 [UNSPLASH SERVICE] API Error Status: ${error.response.status}`)
        console.error(`📊 [UNSPLASH SERVICE] API Error Data:`, error.response.data)
      }

      console.log("🔄 [UNSPLASH SERVICE] Falling back to placeholder images")
      return this.generatePlaceholderImages("random", count)
    }
  }

  async testConnection() {
    console.log("🔧 [UNSPLASH SERVICE] Testing connection...")

    if (!this.accessKey) {
      console.log("⚠️ [UNSPLASH SERVICE] No access key configured")
      return {
        success: false,
        error: "No access key configured",
        fallbackAvailable: true,
      }
    }

    try {
      console.log("📡 [UNSPLASH SERVICE] Testing API connection...")

      const response = await axios.get(`${this.baseURL}/photos/random`, {
        params: { count: 1 },
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          "Accept-Version": "v1",
        },
        timeout: 5000,
      })

      console.log("✅ [UNSPLASH SERVICE] Connection test successful")
      return {
        success: true,
        status: response.status,
        rateLimit: {
          remaining: response.headers["x-ratelimit-remaining"],
          limit: response.headers["x-ratelimit-limit"],
        },
      }
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Connection test failed:", error.message)

      const errorDetails = { error: error.message }
      if (error.response) {
        errorDetails.status = error.response.status
        errorDetails.statusText = error.response.statusText

        if (error.response.status === 401) {
          errorDetails.error = "Invalid access key"
        } else if (error.response.status === 403) {
          errorDetails.error = "Rate limit exceeded or access denied"
        }
      }

      return {
        success: false,
        fallbackAvailable: true,
        ...errorDetails,
      }
    }
  }

  getStatus() {
    return {
      hasAccessKey: !!this.accessKey,
      baseUrl: this.baseURL,
    }
  }

  async fetchRandomImage(query) {
    if (!this.accessKey) {
      console.warn("⚠️ [UNSPLASH SERVICE] UNSPLASH_ACCESS_KEY is not set. Skipping real image fetch.")
      return "/placeholder.svg?height=400&width=600" // Fallback placeholder
    }

    const url = `${this.baseURL}/photos/random?query=${encodeURIComponent(query)}&client_id=${this.accessKey}`

    try {
      console.log(`🖼️ [UNSPLASH SERVICE] Fetching image for query: "${query}"`)
      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Unsplash API responded with status ${response.status}: ${errorText}`)
      }
      const data = await response.json()
      if (data && data.urls && data.urls.regular) {
        console.log(`✅ [UNSPLASH SERVICE] Fetched image URL: ${data.urls.regular}`)
        return data.urls.regular
      } else {
        console.warn("⚠️ [UNSPLASH SERVICE] No image found for query, returning placeholder.")
        return "/placeholder.svg?height=400&width=600"
      }
    } catch (error) {
      console.error("❌ [UNSPLASH SERVICE] Error fetching image:", error.message)
      return "/placeholder.svg?height=400&width=600" // Fallback placeholder on error
    }
  }

  generatePlaceholderImages(query, count = 3) {
    console.log(`🎭 [UNSPLASH SERVICE] Generating ${count} placeholder images for "${query}"`)

    const images = []
    const dimensions = [
      { width: 800, height: 600 },
      { width: 1200, height: 800 },
      { width: 1000, height: 667 },
    ]

    for (let i = 0; i < count; i++) {
      const dim = dimensions[i % dimensions.length]
      const encodedQuery = encodeURIComponent(query)

      images.push({
        id: `placeholder-${i + 1}-${Date.now()}`,
        url: `/placeholder.svg?height=${dim.height}&width=${dim.width}&text=${encodedQuery}`,
        thumbnail: `/placeholder.svg?height=300&width=400&text=${encodedQuery}`,
        alt: `${query} - Image ${i + 1}`,
        width: dim.width,
        height: dim.height,
        photographer: {
          name: "TrendWise",
          username: "trendwise",
          profile: "https://trendwise.com",
        },
        downloadUrl: `/placeholder.svg?height=${dim.height}&width=${dim.width}&text=${encodedQuery}`,
        unsplashUrl: "https://unsplash.com",
        color: "#6366f1",
        likes: Math.floor(Math.random() * 100) + 10,
        isPlaceholder: true,
      })
    }

    console.log(`✅ [UNSPLASH SERVICE] Generated ${images.length} placeholder images`)
    return images
  }

  getPlaceholderImages(query, count = 1) {
    const images = []
    for (let i = 0; i < count; i++) {
      images.push({
        id: `placeholder-${i}`,
        url: `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(query)}`,
        thumbnail: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(query)}`,
        alt: query,
        author: "Placeholder",
        authorUrl: "#",
        downloadUrl: "#",
      })
    }
    return images
  }
}

module.exports = new UnsplashService()
