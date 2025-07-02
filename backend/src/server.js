const fastify = require("fastify")

// Determine if we're in production
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true" || !process.env.NODE_ENV

// Create Fastify instance with proper logger configuration
const app = fastify({
  logger: isProduction
    ? { level: "info" } // Simple JSON logging for production
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      },
})

// Import services
const connectDB = require("./config/database")
const { startTrendBot } = require("./services/trendBot")

// CORS configuration
app.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:3000",
    "https://trendwise-frontend.vercel.app",
    "https://trendwise-frontend-git-main-your-username.vercel.app",
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
})

// Health check routes
app.get("/", async (request, reply) => {
  return {
    message: "TrendWise Backend API is running!",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  }
})

app.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "development",
  }
})

app.get("/api/health/detailed", async (request, reply) => {
  const mongoose = require("mongoose")

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      groq: process.env.GROQ_API_KEY ? "configured" : "not configured",
      gnews: process.env.GNEWS_API_KEY ? "configured" : "not configured",
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "development",
  }
})

// Register API routes
app.register(require("./routes/articles"), { prefix: "/api" })
app.register(require("./routes/auth"), { prefix: "/api" })
app.register(require("./routes/admin"), { prefix: "/api" })
app.register(require("./routes/comments"), { prefix: "/api" })
app.register(require("./routes/trends"), { prefix: "/api" })

// Start server
const start = async () => {
  try {
    // Connect to database
    await connectDB()
    app.log.info("✅ Database connected successfully")

    // Start the server
    const port = process.env.PORT || 3001
    const host = isProduction ? "0.0.0.0" : "localhost"

    await app.listen({ port: Number.parseInt(port), host })
    app.log.info(`🚀 Server running on ${host}:${port}`)

    // Start TrendBot after server is running
    if (process.env.GROQ_API_KEY) {
      app.log.info("🤖 Starting TrendBot...")
      await startTrendBot()
      app.log.info("✅ TrendBot started successfully")
    } else {
      app.log.warn("⚠️ GROQ_API_KEY not found, TrendBot disabled")
    }
  } catch (err) {
    app.log.error("❌ Error starting server:", err)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  app.log.info("🛑 SIGTERM received, shutting down gracefully")
  await app.close()
  process.exit(0)
})

process.on("SIGINT", async () => {
  app.log.info("🛑 SIGINT received, shutting down gracefully")
  await app.close()
  process.exit(0)
})

start()
