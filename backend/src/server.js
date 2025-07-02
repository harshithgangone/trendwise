const fastify = require("fastify")({ logger: true })
require("dotenv").config()

console.log("🚀 [Server] Starting TrendWise Backend Server...")
console.log("🔧 [Server] Environment:", process.env.NODE_ENV || "development")

// Register plugins
fastify.register(require("@fastify/cors"), {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
})

fastify.register(require("@fastify/helmet"))

// Database connection
console.log("🗄️ [Server] Connecting to database...")
require("./config/database")

// Register routes
console.log("🛣️ [Server] Registering routes...")
fastify.register(require("./routes/articles"), { prefix: "/api/articles" })
fastify.register(require("./routes/trends"), { prefix: "/api/trends" })
fastify.register(require("./routes/admin"), { prefix: "/api/admin" })
fastify.register(require("./routes/comments"), { prefix: "/api/comments" })

// Health check
fastify.get("/health", async (request, reply) => {
  return { 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }
})

// Enhanced health check for monitoring
fastify.get("/api/health/detailed", async (request, reply) => {
  const trendBot = require("./services/trendBot")
  
  return {
    server: {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    },
    bot: trendBot.getStatus(),
    database: {
      status: "connected" // You can enhance this with actual DB health check
    }
  }
})

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3001
    const host = "0.0.0.0"
    
    console.log(`🌐 [Server] Starting server on ${host}:${port}`)
    
    await fastify.listen({
      port: port,
      host: host,
    })
    
    console.log("✅ [Server] TrendWise Backend Server running successfully!")
    console.log(`🔗 [Server] Server URL: http://${host}:${port}`)
    console.log(`🏥 [Server] Health check: http://${host}:${port}/health`)
    
    // Start the bot after server is running
    console.log("🤖 [Server] Initializing TrendBot...")
    const trendBot = require("./services/trendBot")
    
    // Give the server a moment to fully initialize
    setTimeout(async () => {
      try {
        const result = await trendBot.start()
        if (result.success) {
          console.log("✅ [Server] TrendBot started successfully")
        } else {
          console.warn("⚠️ [Server] TrendBot failed to start:", result.message)
        }
      } catch (error) {
        console.error("❌ [Server] Failed to start TrendBot:", error.message)
      }
    }, 2000)
    
  } catch (err) {
    console.error("❌ [Server] Failed to start server:", err.message)
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log("🛑 [Server] Received SIGTERM, shutting down gracefully...")
  
  try {
    const trendBot = require("./services/trendBot")
    await trendBot.stop()
    console.log("✅ [Server] TrendBot stopped")
  } catch (error) {
    console.error("❌ [Server] Error stopping TrendBot:", error.message)
  }
  
  try {
    await fastify.close()
    console.log("✅ [Server] Server closed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error closing server:", error.message)
    process.exit(1)
  }
})

process.on('SIGINT', async () => {
  console.log("🛑 [Server] Received SIGINT, shutting down gracefully...")
  
  try {
    const trendBot = require("./services/trendBot")
    await trendBot.stop()
    console.log("✅ [Server] TrendBot stopped")
  } catch (error) {
    console.error("❌ [Server] Error stopping TrendBot:", error.message)
  }
  
  try {
    await fastify.close()
    console.log("✅ [Server] Server closed")
    process.exit(0)
  } catch (error) {
    console.error("❌ [Server] Error closing server:", error.message)
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error("💥 [Server] Uncaught Exception:", error.message)
  console.error("🔍 [Server] Stack trace:", error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error("💥 [Server] Unhandled Rejection at:", promise)
  console.error("🔍 [Server] Reason:", reason)
  process.exit(1)
})

start()
