const fastify = require("fastify")

// Determine if in production environment
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true"

// Initialize Fastify with conditional logger
const app = fastify({
  logger: isProduction
    ? { level: "info" } // Simple logger for production
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        },
      },
})

// Register CORS plugin
app.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:3000",
    "https://trendwise-frontend.vercel.app",
    "https://trendwise.vercel.app",
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
})

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoose = require("mongoose")
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trendwise")
    app.log.info("✅ [DATABASE] MongoDB Connected")
    return true
  } catch (error) {
    app.log.error("❌ [DATABASE] MongoDB Connection Failed:", error)
    return false
  }
}

// Register routes
app.register(require("./routes/articles"), { prefix: "/api" })
app.register(require("./routes/admin"), { prefix: "/api" })
app.register(require("./routes/auth"), { prefix: "/api" })
app.register(require("./routes/comments"), { prefix: "/api" })
app.register(require("./routes/trends"), { prefix: "/api" })

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

// Start the server
const start = async () => {
  try {
    // Connect to database
    await connectDB()

    // Start the server
    const port = process.env.PORT || 3001
    const host = "0.0.0.0"

    await app.listen({ port: Number.parseInt(port), host })
    app.log.info(`🚀 Server running on ${host}:${port}`)

    // Start TrendBot
    const trendBot = require("./services/trendBot")
    if (trendBot && trendBot.start) {
      trendBot.start()
      app.log.info("✅ TrendBot started")
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
