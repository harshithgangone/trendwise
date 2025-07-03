const fastify = require("fastify")({ logger: true })
const mongoose = require("mongoose")
require("dotenv").config()

// Import routes
const articlesRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const commentsRoutes = require("./routes/comments")
const trendsRoutes = require("./routes/trends")

// Register plugins
fastify.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:3000",
    "https://trendwise-frontend.vercel.app",
    "https://trendwise.vercel.app",
    /\.vercel\.app$/,
  ],
  credentials: true,
})

fastify.register(require("@fastify/helmet"), {
  contentSecurityPolicy: false,
})

// Database connection
async function connectDatabase() {
  try {
    console.log("🗄️ [Database] Connecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise")
    console.log("✅ [Database] Connected to MongoDB successfully")
  } catch (error) {
    console.error("❌ [Database] Connection failed:", error)
    process.exit(1)
  }
}

// Register routes - FIXED: Only register each route once
fastify.register(articlesRoutes, { prefix: "/api" })
fastify.register(adminRoutes, { prefix: "/api" })
fastify.register(commentsRoutes, { prefix: "/api" })
fastify.register(trendsRoutes, { prefix: "/api" })

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }
})

// Root endpoint
fastify.get("/", async (request, reply) => {
  return {
    message: "TrendWise Backend API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  }
})

// Start server
async function start() {
  try {
    console.log("🚀 [Server] Starting TrendWise Backend Server...")
    console.log(`🌍 [Server] Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🔧 [Server] Node.js version: ${process.version}`)

    // Connect to database
    await connectDatabase()

    // Start server
    const port = process.env.PORT || 10000
    const host = process.env.HOST || "0.0.0.0"

    await fastify.listen({ port, host })
    console.log(`✅ [Server] Server running on http://${host}:${port}`)

    // Start TrendBot after a delay
    console.log("🤖 [Server] Starting TrendBot...")
    setTimeout(async () => {
      try {
        const trendBot = require("./services/trendBot")
        if (trendBot && typeof trendBot.start === "function") {
          await trendBot.start()
          console.log("✅ [Server] TrendBot started successfully")
        } else {
          console.log("⚠️ [Server] TrendBot not available or start method missing")
        }
      } catch (error) {
        console.error("❌ [Server] TrendBot failed to start:", error.message)
      }
    }, 10000)

    console.log("🎉 [Server] All systems operational!")
  } catch (error) {
    console.error("❌ [Server] Failed to start:", error)
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

process.on("uncaughtException", (error) => {
  console.error("❌ [Server] Uncaught Exception:", error)
  console.log("🛑 [Server] Received UNCAUGHT_EXCEPTION, shutting down gracefully...")
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
})

// Start the server
start()
