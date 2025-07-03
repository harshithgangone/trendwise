const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const fastify = require("fastify")({ logger: true })

// Import routes
const articlesRoutes = require("./routes/articles")
const adminRoutes = require("./routes/admin")
const commentsRoutes = require("./routes/comments")
const trendsRoutes = require("./routes/trends")

// Import services
const trendBot = require("./services/trendBot")

// Database connection
require("./config/database")

const app = express()
const PORT = process.env.PORT || 3001

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log(`🌍 [Server] Environment: ${process.env.NODE_ENV || "development"}`)
console.log(`🔧 [Server] Node.js version: ${process.version}`)

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
      },
    },
  }),
)

// Compression middleware
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://trendwise-frontend.vercel.app",
    "https://trendwise-frontend-git-main-your-username.vercel.app",
    "https://trendwise-frontend-your-username.vercel.app",
    /\.vercel\.app$/,
    /localhost:\d+$/,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "TrendWise Backend API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    status: "healthy",
  })
})

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "1.0.0",
  })
})

// API Routes
app.use("/api/articles", articlesRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/comments", commentsRoutes)
app.use("/api/trends", trendsRoutes)

// 404 handler
app.use("*", (req, res) => {
  console.log(`❌ [Server] Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error("❌ [Server] Global error:", error)
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    timestamp: new Date().toISOString(),
  })
})

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ [Server] Server running on http://0.0.0.0:${PORT}`)

  // Start TrendBot
  console.log("🤖 [Server] Starting TrendBot...")
  try {
    await trendBot.start()
    console.log("✅ [Server] TrendBot started successfully")
  } catch (error) {
    console.error("❌ [Server] Failed to start TrendBot:", error)
  }

  console.log("🎉 [Server] All systems operational!")
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 [Server] SIGTERM received, shutting down gracefully...")
  await trendBot.stop()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("🛑 [Server] SIGINT received, shutting down gracefully...")
  await trendBot.stop()
  process.exit(0)
})

module.exports = app
