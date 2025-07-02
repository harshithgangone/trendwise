// Check if we're in production environment
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true" || !process.env.NODE_ENV

const fastify = require("fastify")({
  logger: isProduction
    ? {
        level: "info",
      }
    : {
        level: "info",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      },
})

const mongoose = require("mongoose")
require("dotenv").config()

// Import services
const trendBot = require("./services/trendBot")
const groqService = require("./services/groqService")

// Import routes
const articlesRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const commentsRoutes = require("./routes/comments")
const trendsRoutes = require("./routes/trends")
const authRoutes = require("./routes/auth")

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

// Database connection with enhanced logging
async function connectDatabase() {
  try {
    fastify.log.info("🗄️ [DATABASE] Connecting to MongoDB...")
    fastify.log.info(`🔗 [DATABASE] Connection string: ${process.env.MONGODB_URI ? "Present ✅" : "Missing ❌"}`)

    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    fastify.log.info("✅ [DATABASE] Connected to MongoDB successfully")
    fastify.log.info(`📊 [DATABASE] Database: ${mongoose.connection.name}`)
    fastify.log.info(`🏠 [DATABASE] Host: ${mongoose.connection.host}`)

    // Test database with a simple query
    const collections = await mongoose.connection.db.listCollections().toArray()
    fastify.log.info(`📚 [DATABASE] Available collections: ${collections.map((c) => c.name).join(", ")}`)
  } catch (error) {
    fastify.log.error("❌ [DATABASE] Connection failed:", error)
    process.exit(1)
  }
}

// Register routes with logging
fastify.log.info("🛣️ [ROUTES] Registering API routes...")
fastify.register(articlesRoutes, { prefix: "/api/articles" })
fastify.register(adminRoutes, { prefix: "/api/admin" })
fastify.register(commentsRoutes, { prefix: "/api/comments" })
fastify.register(trendsRoutes, { prefix: "/api/trends" })
fastify.register(authRoutes, { prefix: "/api/auth" })
fastify.log.info("✅ [ROUTES] All routes registered")

// Enhanced health check endpoint
fastify.get("/health", async (request, reply) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      name: mongoose.connection.name,
      host: mongoose.connection.host,
    },
    services: {
      trendBot: trendBot.getStatus(),
      groq: groqService.getStatus(),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3001,
      groqApiKey: !!process.env.GROQ_API_KEY,
      mongoUri: !!process.env.MONGODB_URI,
      isProduction: isProduction,
    },
  }

  return health
})

// Detailed health check
fastify.get("/api/health/detailed", async (request, reply) => {
  fastify.log.info("🏥 [HEALTH] Detailed health check requested")

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
      readyState: mongoose.connection.readyState,
    },
    services: {
      trendBot: trendBot.getStatus(),
      groq: groqService.getStatus(),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3001,
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasMongoUri: !!process.env.MONGODB_URI,
      isProduction: isProduction,
      renderEnv: process.env.RENDER || "false",
    },
  }

  fastify.log.info("📊 [HEALTH] Health check completed")
  return detailedHealth
})

// Error handler with enhanced logging
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error("❌ [SERVER] Error occurred:")
  fastify.log.error(`   URL: ${request.method} ${request.url}`)
  fastify.log.error(`   Error: ${error.message}`)
  if (!isProduction) {
    fastify.log.error(`   Stack: ${error.stack}`)
  }

  reply.status(500).send({
    success: false,
    error: "Internal Server Error",
    message: !isProduction ? error.message : "Something went wrong",
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`🛑 [SERVER] Received ${signal}, shutting down gracefully...`)

  try {
    // Stop the trend bot
    if (trendBot && trendBot.isActive) {
      fastify.log.info("🤖 [SERVER] Stopping TrendBot...")
      trendBot.stop()
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      fastify.log.info("🗄️ [SERVER] Closing database connection...")
      await mongoose.connection.close()
    }

    // Close fastify server
    fastify.log.info("🚀 [SERVER] Closing HTTP server...")
    await fastify.close()

    fastify.log.info("✅ [SERVER] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    fastify.log.error("❌ [SERVER] Error during shutdown:", error)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Start server with enhanced logging
const start = async () => {
  try {
    fastify.log.info("🚀 [SERVER] Starting TrendWise Backend Server...")
    fastify.log.info(`🌍 [SERVER] Environment: ${process.env.NODE_ENV || "development"}`)
    fastify.log.info(`🌍 [SERVER] Is Production: ${isProduction}`)
    fastify.log.info(`🌍 [SERVER] Render Environment: ${process.env.RENDER || "false"}`)
    fastify.log.info(`🔧 [SERVER] Node.js version: ${process.version}`)
    fastify.log.info(`🔑 [SERVER] Environment variables check:`)
    fastify.log.info(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "Present ✅" : "Missing ❌"}`)
    fastify.log.info(`   MONGODB_URI: ${process.env.MONGODB_URI ? "Present ✅" : "Missing ❌"}`)
    fastify.log.info(`   PORT: ${process.env.PORT || 3001}`)

    // Connect to database first
    await connectDatabase()

    // Test Groq service
    fastify.log.info("🤖 [SERVER] Testing Groq service...")
    const groqHealthy = await groqService.healthCheck()
    fastify.log.info(`🤖 [SERVER] Groq service: ${groqHealthy ? "Healthy ✅" : "Unhealthy ❌"}`)

    // Start the server
    const port = process.env.PORT || 3001
    const host = isProduction ? "0.0.0.0" : "localhost"

    await fastify.listen({ port: Number.parseInt(port), host })
    fastify.log.info(`✅ [SERVER] Server running on http://${host}:${port}`)
    fastify.log.info(`🔗 [SERVER] Health check: http://${host}:${port}/health`)

    // Start TrendBot after server is running
    fastify.log.info("🤖 [SERVER] Starting TrendBot...")
    try {
      trendBot.start()
      fastify.log.info("✅ [SERVER] TrendBot started successfully")
    } catch (botError) {
      fastify.log.error("❌ [SERVER] Failed to start TrendBot:", botError)
      // Don't exit - server can run without bot
    }

    fastify.log.info("🎉 [SERVER] All systems operational!")
    fastify.log.info("📊 [SERVER] Available endpoints:")
    fastify.log.info("   GET  /health")
    fastify.log.info("   GET  /api/health/detailed")
    fastify.log.info("   GET  /api/articles")
    fastify.log.info("   GET  /api/articles/trending")
    fastify.log.info("   GET  /api/articles/categories")
    fastify.log.info("   POST /api/auth/google-signin")
  } catch (error) {
    fastify.log.error("❌ [SERVER] Failed to start:", error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  fastify.log.error("❌ [SERVER] Uncaught Exception:", error)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  fastify.log.error("❌ [SERVER] Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

// Start the application
start()
