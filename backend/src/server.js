const fastify = require("fastify")({ logger: true })
const mongoose = require("mongoose")
require("dotenv").config()

// Import services
const trendBot = require("./services/trendBot")

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
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ [Database] Connected to MongoDB successfully")
  } catch (error) {
    console.error("❌ [Database] Connection failed:", error)
    process.exit(1)
  }
}

// Register routes
fastify.register(articlesRoutes, { prefix: "/api/articles" })
fastify.register(adminRoutes, { prefix: "/api/admin" })
fastify.register(commentsRoutes, { prefix: "/api/comments" })
fastify.register(trendsRoutes, { prefix: "/api/trends" })

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    bot: trendBot.getStatus(),
  }

  return health
})

// Detailed health check
fastify.get("/api/health/detailed", async (request, reply) => {
  const detailedHealth = {
    server: {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
    database: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    },
    bot: trendBot.getStatus(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3001,
    },
  }

  return detailedHealth
})

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  console.error("❌ [Server] Error:", error)
  reply.status(500).send({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 [Server] Received ${signal}, shutting down gracefully...`)

  try {
    // Stop the trend bot
    if (trendBot && trendBot.isActive) {
      console.log("🤖 [Server] Stopping TrendBot...")
      trendBot.stop()
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      console.log("🗄️ [Server] Closing database connection...")
      await mongoose.connection.close()
    }

    // Close fastify server
    console.log("🚀 [Server] Closing HTTP server...")
    await fastify.close()

    console.log("✅ [Server] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error during shutdown:", error)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Start server
const start = async () => {
  try {
    console.log("🚀 [Server] Starting TrendWise Backend Server...")
    console.log(`🌍 [Server] Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🔧 [Server] Node.js version: ${process.version}`)

    // Connect to database first
    await connectDatabase()

    // Start the server
    const port = process.env.PORT || 3001
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost"

    await fastify.listen({ port: Number.parseInt(port), host })
    console.log(`✅ [Server] Server running on http://${host}:${port}`)

    // Start TrendBot after server is running
    console.log("🤖 [Server] Starting TrendBot...")
    try {
      // Give the server a moment to fully initialize
      setTimeout(() => {
        trendBot.start()
        console.log("✅ [Server] TrendBot started successfully")

        // Trigger an immediate run after 10 seconds
        setTimeout(() => {
          console.log("🚀 [Server] Triggering initial TrendBot run...")
          trendBot.runCycle().catch((error) => {
            console.error("❌ [Server] Initial TrendBot run failed:", error)
          })
        }, 10000)
      }, 2000)
    } catch (botError) {
      console.error("❌ [Server] Failed to start TrendBot:", botError)
      // Don't exit - server can run without bot
    }

    console.log("🎉 [Server] All systems operational!")
  } catch (error) {
    console.error("❌ [Server] Failed to start:", error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ [Server] Uncaught Exception:", error)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [Server] Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

// Start the application
start()