const fastify = require("fastify")({
  logger: {
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
    console.log("🗄️ [DATABASE] Connecting to MongoDB...")
    console.log(`🔗 [DATABASE] Connection string: ${process.env.MONGODB_URI ? "Present ✅" : "Missing ❌"}`)

    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("✅ [DATABASE] Connected to MongoDB successfully")
    console.log(`📊 [DATABASE] Database: ${mongoose.connection.name}`)
    console.log(`🏠 [DATABASE] Host: ${mongoose.connection.host}`)

    // Test database with a simple query
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log(`📚 [DATABASE] Available collections: ${collections.map((c) => c.name).join(", ")}`)
  } catch (error) {
    console.error("❌ [DATABASE] Connection failed:", error)
    process.exit(1)
  }
}

// Register routes with logging
console.log("🛣️ [ROUTES] Registering API routes...")
fastify.register(articlesRoutes, { prefix: "/api/articles" })
fastify.register(adminRoutes, { prefix: "/api/admin" })
fastify.register(commentsRoutes, { prefix: "/api/comments" })
fastify.register(trendsRoutes, { prefix: "/api/trends" })
fastify.register(authRoutes, { prefix: "/api/auth" })
console.log("✅ [ROUTES] All routes registered")

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
    },
  }

  return health
})

// Detailed health check
fastify.get("/api/health/detailed", async (request, reply) => {
  console.log("🏥 [HEALTH] Detailed health check requested")

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
    },
  }

  console.log("📊 [HEALTH] Health check completed")
  return detailedHealth
})

// Error handler with enhanced logging
fastify.setErrorHandler((error, request, reply) => {
  console.error("❌ [SERVER] Error occurred:")
  console.error(`   URL: ${request.method} ${request.url}`)
  console.error(`   Error: ${error.message}`)
  console.error(`   Stack: ${error.stack}`)

  reply.status(500).send({
    success: false,
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 [SERVER] Received ${signal}, shutting down gracefully...`)

  try {
    // Stop the trend bot
    if (trendBot && trendBot.isActive) {
      console.log("🤖 [SERVER] Stopping TrendBot...")
      trendBot.stop()
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      console.log("🗄️ [SERVER] Closing database connection...")
      await mongoose.connection.close()
    }

    // Close fastify server
    console.log("🚀 [SERVER] Closing HTTP server...")
    await fastify.close()

    console.log("✅ [SERVER] Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [SERVER] Error during shutdown:", error)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Start server with enhanced logging
const start = async () => {
  try {
    console.log("🚀 [SERVER] Starting TrendWise Backend Server...")
    console.log(`🌍 [SERVER] Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`🔧 [SERVER] Node.js version: ${process.version}`)
    console.log(`🔑 [SERVER] Environment variables check:`)
    console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "Present ✅" : "Missing ❌"}`)
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "Present ✅" : "Missing ❌"}`)
    console.log(`   PORT: ${process.env.PORT || 3001}`)

    // Connect to database first
    await connectDatabase()

    // Test Groq service
    console.log("🤖 [SERVER] Testing Groq service...")
    const groqHealthy = await groqService.healthCheck()
    console.log(`🤖 [SERVER] Groq service: ${groqHealthy ? "Healthy ✅" : "Unhealthy ❌"}`)

    // Start the server
    const port = process.env.PORT || 3001
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost"

    await fastify.listen({ port: Number.parseInt(port), host })
    console.log(`✅ [SERVER] Server running on http://${host}:${port}`)
    console.log(`🔗 [SERVER] Health check: http://${host}:${port}/health`)

    // Start TrendBot after server is running
    console.log("🤖 [SERVER] Starting TrendBot...")
    try {
      trendBot.start()
      console.log("✅ [SERVER] TrendBot started successfully")
    } catch (botError) {
      console.error("❌ [SERVER] Failed to start TrendBot:", botError)
      // Don't exit - server can run without bot
    }

    console.log("🎉 [SERVER] All systems operational!")
    console.log("📊 [SERVER] Available endpoints:")
    console.log("   GET  /health")
    console.log("   GET  /api/health/detailed")
    console.log("   GET  /api/articles")
    console.log("   GET  /api/articles/trending")
    console.log("   GET  /api/articles/categories")
    console.log("   POST /api/auth/google-signin")
  } catch (error) {
    console.error("❌ [SERVER] Failed to start:", error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ [SERVER] Uncaught Exception:", error)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [SERVER] Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

// Start the application
start()
