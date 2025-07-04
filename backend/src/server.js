const fastify = require("fastify")({ logger: false })
const cors = require("@fastify/cors")
const path = require("path")

// Import database connection function
const { connectDB, mongoose } = require("./config/database")

// Import routes
const articleRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const commentRoutes = require("./routes/comments")
const trendRoutes = require("./routes/trends")

// Import services
const trendBot = require("./services/trendBot")

// Environment variables
const PORT = process.env.PORT || 10000
const HOST = process.env.HOST || "0.0.0.0"
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise"

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log(`🌍 [Server] Environment: ${process.env.NODE_ENV || "development"}`)
console.log(`🔧 [Server] Node.js version: ${process.version}`)

// Database connection function
async function connectDatabase() {
  try {
    console.log("🗄️ [Database] Connecting to MongoDB...")
    await connectDB()
    console.log("✅ [Database] Connected to MongoDB successfully")
  } catch (error) {
    console.error("❌ [Database] Failed to connect to MongoDB:", error.message)
    throw error
  }
}

// Register CORS
async function registerCors() {
  try {
    await fastify.register(cors, {
      origin: [
        "http://localhost:3000",
        "https://trendwise-frontend.vercel.app",
        "https://trendwise.vercel.app",
        /\.vercel\.app$/,
        /localhost/,
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "User-Agent"],
      credentials: true,
    })
    console.log("✅ [Server] CORS configured")
  } catch (error) {
    console.error("❌ [Server] Failed to register CORS:", error.message)
    throw error
  }
}

// Register routes
async function registerRoutes() {
  try {
    console.log("📝 [Server] Registering routes...")

    // Health check route
    fastify.get("/health", async (request, reply) => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          database: mongoose.connection.readyState === 1,
          trendBot: trendBot.getStatus(),
        },
      }
    })

    // Register API routes
    await fastify.register(articleRoutes)
    await fastify.register(adminRoutes)
    await fastify.register(commentRoutes)
    await fastify.register(trendRoutes)

    console.log("✅ [Server] All routes registered successfully")
  } catch (error) {
    console.error("❌ [Server] Failed to register routes:", error.message)
    throw error
  }
}

// Start TrendBot
async function startTrendBot() {
  try {
    console.log("🤖 [Server] Starting TrendBot...")

    if (trendBot && typeof trendBot.start === "function") {
      await trendBot.start()
      console.log("✅ [Server] TrendBot started successfully")
    } else {
      console.log("⚠️ [Server] TrendBot not available or start method missing")
    }
  } catch (error) {
    console.error("❌ [Server] Failed to start TrendBot:", error.message)
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  try {
    console.log("🛑 [Server] Received shutdown signal, shutting down gracefully...")

    // Stop TrendBot
    if (trendBot && typeof trendBot.stop === "function") {
      await trendBot.stop()
      console.log("✅ [Server] TrendBot stopped")
    }

    // Close database connection
    console.log("🗄️ [Server] Closing database connection...")
    await mongoose.connection.close()
    console.log("✅ [Server] Database connection closed")

    // Close HTTP server
    console.log("🚀 [Server] Closing HTTP server...")
    await fastify.close()
    console.log("✅ [Server] HTTP server closed")

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error.message)
    process.exit(1)
  }
}

// Error handlers
process.on("uncaughtException", (error) => {
  console.error("❌ [Server] Uncaught Exception:", error.message)
  console.log("🛑 [Server] Received UNCAUGHT_EXCEPTION, shutting down gracefully...")
  gracefulShutdown()
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
  console.log("🛑 [Server] Received UNHANDLED_REJECTION, shutting down gracefully...")
  gracefulShutdown()
})

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()

    // Register CORS
    await registerCors()

    // Register routes
    await registerRoutes()

    // Start the server
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`✅ [Server] Server running on http://${HOST}:${PORT}`)

    // Start TrendBot after server is running
    setTimeout(startTrendBot, 5000) // Start TrendBot 5 seconds after server starts

    console.log("🎉 [Server] All systems operational!")
  } catch (error) {
    console.error("❌ [Server] Failed to start:", error.message)
    process.exit(1)
  }
}

// Start the server
startServer()