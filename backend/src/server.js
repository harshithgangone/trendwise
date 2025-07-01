const fastify = require("fastify")({ logger: true })
require("dotenv").config()

// Register plugins
fastify.register(require("@fastify/cors"), {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
})

fastify.register(require("@fastify/helmet"))

// Database connection
require("./config/database")

// Register routes
fastify.register(require("./routes/articles"), { prefix: "/api/articles" })
fastify.register(require("./routes/trends"), { prefix: "/api/trends" })
fastify.register(require("./routes/admin"), { prefix: "/api/admin" })
fastify.register(require("./routes/comments"), { prefix: "/api/comments" })

// Health check
fastify.get("/health", async (request, reply) => {
  return { status: "OK", timestamp: new Date().toISOString() }
})

// Start the bot
const trendBot = require("./services/trendBot")
trendBot.start()

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 3001,
      host: "0.0.0.0",
    })
    console.log("TrendWise Backend Server running on port", process.env.PORT || 3001)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
