const fastify = require("fastify")({ logger: false })
const mongoose = require("mongoose")
const cors = require("@fastify/cors")

// Import services
const trendBot = require("./services/trendBot")
const gnewsService = require("./services/gnewsService")
const groqService = require("./services/groqService")
const unsplashService = require("./services/unsplashService")
const trendCrawler = require("./services/trendCrawler")

// Import routes
const articleRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const trendsRoutes = require("./routes/trends")
const commentsRoutes = require("./routes/comments")

// Environment variables
const PORT = process.env.PORT || 10000
const HOST = process.env.HOST || "0.0.0.0"
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise"

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log(`🌍 [Server] Environment: ${process.env.NODE_ENV || "development"}`)
console.log(`🔧 [Server] Node.js version: ${process.version}`)

// Register CORS
fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
})

// Connect to MongoDB
async function connectDatabase() {
  try {
    console.log("🗄️ [Database] Connecting to MongoDB...")

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("✅ [Database] Connected to MongoDB successfully")
  } catch (error) {
    console.error("❌ [Database] Connection failed:", error.message)
    process.exit(1)
  }
}

// Register routes
async function registerRoutes() {
  try {
    // Health check route
    fastify.get("/health", async (request, reply) => {
      const services = {
        gnews: gnewsService.getHealthStatus(),
        groq: groqService.getHealthStatus(),
        unsplash: unsplashService.getHealthStatus(),
        trendCrawler: trendCrawler.getHealthStatus(),
        trendBot: trendBot.getHealthStatus(),
      }

      const allHealthy = Object.values(services).every((service) => service.isHealthy)

      return reply.status(allHealthy ? 200 : 503).send({
        status: allHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        services,
      })
    })

    // API routes
    fastify.register(articleRoutes, { prefix: "/api" })
    fastify.register(adminRoutes, { prefix: "/api" })
    fastify.register(trendsRoutes, { prefix: "/api" })
    fastify.register(commentsRoutes, { prefix: "/api" })

    console.log("✅ [Server] Routes registered successfully")
  } catch (error) {
    console.error("❌ [Server] Route registration failed:", error.message)
    throw error
  }
}

// Initialize services
async function initializeServices() {
  try {
    console.log("🔧 [Server] Initializing services...")

    // Test all service connections
    const serviceTests = await Promise.allSettled([
      gnewsService.testConnection(),
      groqService.testConnection(),
      unsplashService.testConnection(),
    ])

    serviceTests.forEach((result, index) => {
      const services = ["GNews", "Groq", "Unsplash"]
      if (result.status === "fulfilled") {
        console.log(`✅ [Server] ${services[index]} service initialized`)
      } else {
        console.warn(`⚠️ [Server] ${services[index]} service failed: ${result.reason?.message}`)
      }
    })

    console.log("✅ [Server] Services initialized")
  } catch (error) {
    console.error("❌ [Server] Service initialization failed:", error.message)
    // Don't exit - services can work in fallback mode
  }
}

// Start TrendBot
async function startTrendBot() {
  try {
    console.log("🤖 [Server] Starting TrendBot...")

    // Start TrendBot after a short delay to ensure everything is ready
    setTimeout(async () => {
      try {
        await trendBot.start()
        console.log("✅ [Server] TrendBot started successfully")
      } catch (error) {
        console.error("❌ [Server] TrendBot failed to start:", error.message)
      }
    }, 10000) // 10 second delay
  } catch (error) {
    console.error("❌ [Server] TrendBot initialization failed:", error.message)
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log("🛑 [Server] Received shutdown signal, shutting down gracefully...")

  try {
    // Stop TrendBot
    if (trendBot.isRunning) {
      await trendBot.stop()
    }

    // Close database connection
    console.log("🗄️ [Server] Closing database connection...")
    await mongoose.connection.close()

    // Close HTTP server
    console.log("🚀 [Server] Closing HTTP server...")
    await fastify.close()

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error.message)
    process.exit(1)
  }
}

// Error handlers
process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

process.on("uncaughtException", (error) => {
  console.error("❌ [Server] Uncaught Exception:", error.message)
  console.error(error.stack)
  console.log("🛑 [Server] Received UNCAUGHT_EXCEPTION, shutting down gracefully...")
  gracefulShutdown()
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
})

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()

    // Register routes
    await registerRoutes()

    // Initialize services
    await initializeServices()

    // Start HTTP server
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`✅ [Server] Server running on http://${HOST}:${PORT}`)

    // Start TrendBot
    await startTrendBot()

    console.log("🎉 [Server] All systems operational!")
  } catch (error) {
    console.error("❌ [Server] Failed to start:", error.message)
    process.exit(1)
  }
}

// Start the server
startServer()
