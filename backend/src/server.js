const fastify = require("fastify")({ logger: false })
const mongoose = require("mongoose")
require("dotenv").config()

// Import routes
const articleRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const commentRoutes = require("./routes/comments")
const trendRoutes = require("./routes/trends")

// Environment variables
const PORT = process.env.PORT || 10000
const HOST = process.env.HOST || "0.0.0.0"
const NODE_ENV = process.env.NODE_ENV || "development"
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise"

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log(`🌍 [Server] Environment: ${NODE_ENV}`)
console.log(`🔧 [Server] Node.js version: ${process.version}`)

// Register CORS
fastify.register(require("@fastify/cors"), {
  origin: ["http://localhost:3000", "https://trendwise-frontend.vercel.app", "https://trendwise.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "User-Agent", "Accept"],
})

// Register JSON parser
fastify.register(require("@fastify/formbody"))

// Database connection function
async function connectDatabase() {
  try {
    console.log("🗄️ [Database] Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)
    console.log("✅ [Database] Connected to MongoDB successfully")
  } catch (error) {
    console.error("❌ [Database] Connection failed:", error.message)
    throw error
  }
}

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: "1.0.0",
      environment: NODE_ENV,
    }
  } catch (error) {
    return reply.status(500).send({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

// Register routes
async function registerRoutes() {
  try {
    console.log("🔗 [Server] Registering routes...")

    await fastify.register(articleRoutes)
    await fastify.register(adminRoutes)
    await fastify.register(commentRoutes)
    await fastify.register(trendRoutes)

    console.log("✅ [Server] All routes registered successfully")
  } catch (error) {
    console.error("❌ [Server] Failed to register routes:", error)
    throw error
  }
}

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()

    // Register routes
    await registerRoutes()

    // Start listening
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`✅ [Server] Server running on http://${HOST}:${PORT}`)

    // Start TrendBot after a delay
    setTimeout(async () => {
      try {
        console.log("🤖 [Server] Starting TrendBot...")
        const trendBot = require("./services/trendBot")

        if (trendBot && typeof trendBot.start === "function") {
          await trendBot.start()
          console.log("✅ [Server] TrendBot started successfully")
        } else {
          console.log("⚠️ [Server] TrendBot not available or start method missing")
        }
      } catch (error) {
        console.error("❌ [Server] Failed to start TrendBot:", error.message)
      }
    }, 10000) // Start TrendBot after 10 seconds

    console.log("🎉 [Server] All systems operational!")
  } catch (error) {
    console.error("❌ [Server] Failed to start:", error.message)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 [Server] Received SIGTERM, shutting down gracefully...")
  try {
    console.log("🗄️ [Server] Closing database connection...")
    await mongoose.connection.close()

    console.log("🚀 [Server] Closing HTTP server...")
    await fastify.close()

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error)
    process.exit(1)
  }
})

process.on("SIGINT", async () => {
  console.log("🛑 [Server] Received SIGINT, shutting down gracefully...")
  try {
    await mongoose.connection.close()
    await fastify.close()
    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error)
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("❌ [Server] Uncaught Exception:", error)
  console.log("🛑 [Server] Received UNCAUGHT_EXCEPTION, shutting down gracefully...")
  try {
    console.log("🗄️ [Server] Closing database connection...")
    await mongoose.connection.close()

    console.log("🚀 [Server] Closing HTTP server...")
    await fastify.close()

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(1)
  } catch (shutdownError) {
    console.error("❌ [Server] Error during shutdown:", shutdownError)
    process.exit(1)
  }
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
})

// Start the server
startServer()
