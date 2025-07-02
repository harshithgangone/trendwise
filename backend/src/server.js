const fastify = require("fastify")({ logger: true })
const mongoose = require("mongoose")
const path = require("path")

// Import services
const trendBot = require("./services/trendBot")

// Environment variables
require("dotenv").config()

const PORT = process.env.PORT || 3001
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise"
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log("🔧 [Server] Configuration:")
console.log(`   - Port: ${PORT}`)
console.log(`   - MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`)
console.log(`   - Frontend URL: ${FRONTEND_URL}`)

// Register plugins
async function registerPlugins() {
  try {
    // CORS configuration
    await fastify.register(require("@fastify/cors"), {
      origin: [FRONTEND_URL, "http://localhost:3000", "https://trendwise-frontend.vercel.app"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })

    // Security headers
    await fastify.register(require("@fastify/helmet"), {
      contentSecurityPolicy: false, // Disable CSP for API
    })

    console.log("✅ [Server] Plugins registered successfully")
  } catch (error) {
    console.error("❌ [Server] Failed to register plugins:", error.message)
    throw error
  }
}

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
    console.error("❌ [Database] Failed to connect to MongoDB:", error.message)
    throw error
  }
}

// Register routes
async function registerRoutes() {
  try {
    console.log("🛣️ [Server] Registering routes...")

    // Health check endpoint
    fastify.get("/health", async (request, reply) => {
      return {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || "development",
      }
    })

    // API routes
    await fastify.register(require("./routes/articles"), { prefix: "/api" })
    await fastify.register(require("./routes/admin"), { prefix: "/api" })
    await fastify.register(require("./routes/comments"), { prefix: "/api" })
    await fastify.register(require("./routes/trends"), { prefix: "/api" })

    console.log("✅ [Server] Routes registered successfully")
  } catch (error) {
    console.error("❌ [Server] Failed to register routes:", error.message)
    throw error
  }
}

// Start TrendBot
async function startTrendBot() {
  try {
    console.log("🤖 [Server] Starting TrendBot...")
    const result = await trendBot.start()

    if (result.success) {
      console.log("✅ [Server] TrendBot started successfully")
      console.log(`⏰ [Server] Next run scheduled for: ${result.nextRun}`)
    } else {
      console.warn("⚠️ [Server] TrendBot failed to start:", result.message)
    }
  } catch (error) {
    console.error("❌ [Server] Error starting TrendBot:", error.message)
    // Don't throw error - server should still start even if bot fails
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🛑 [Server] Received ${signal}, shutting down gracefully...`)

  try {
    // Stop TrendBot
    if (trendBot.isActive) {
      console.log("🤖 [Server] Stopping TrendBot...")
      await trendBot.stop()
    }

    // Close database connection
    console.log("🗄️ [Server] Closing database connection...")
    await mongoose.connection.close()

    // Close Fastify server
    console.log("🚪 [Server] Closing server...")
    await fastify.close()

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error.message)
    process.exit(1)
  }
}

// Main server startup function
async function startServer() {
  try {
    // Register plugins
    await registerPlugins()

    // Connect to database
    await connectDatabase()

    // Register routes
    await registerRoutes()

    // Start the server
    await fastify.listen({
      port: PORT,
      host: "0.0.0.0",
    })

    console.log(`✅ [Server] Server running on http://0.0.0.0:${PORT}`)
    console.log(`🌐 [Server] Health check: http://0.0.0.0:${PORT}/health`)

    // Start TrendBot after server is running
    setTimeout(async () => {
      await startTrendBot()
    }, 2000) // Wait 2 seconds for server to fully initialize
  } catch (error) {
    console.error("❌ [Server] Failed to start server:", error.message)
    console.error("🔍 [Server] Error stack:", error.stack)
    process.exit(1)
  }
}

// Handle process signals for graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ [Server] Uncaught Exception:", error.message)
  console.error("🔍 [Server] Error stack:", error.stack)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

// Start the server
startServer()
