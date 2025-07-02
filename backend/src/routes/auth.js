const User = require("../models/User")
const jwt = require("jsonwebtoken")

async function authRoutes(fastify, options) {
  // Google Sign-In
  fastify.post("/auth/google-signin", async (request, reply) => {
    try {
      const { email, name, picture, googleId } = request.body

      if (!email || !name || !googleId) {
        return reply.status(400).send({
          success: false,
          error: "Missing required fields",
        })
      }

      // Find or create user
      let user = await User.findOne({ email })

      if (!user) {
        user = new User({
          email,
          name,
          avatar: picture || "",
          googleId,
          lastLogin: new Date(),
        })
        await user.save()
      } else {
        // Update existing user
        user.lastLogin = new Date()
        if (picture) user.avatar = picture
        if (!user.googleId) user.googleId = googleId
        await user.save()
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || "fallback-secret", {
        expiresIn: "7d",
      })

      reply.send({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      fastify.log.error("Error in Google sign-in:", error)
      reply.status(500).send({
        success: false,
        error: "Authentication failed",
      })
    }
  })

  // Get user profile
  fastify.get("/auth/profile", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "No token provided",
        })
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret")
      const user = await User.findById(decoded.userId).select("-password")

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "User not found",
        })
      }

      reply.send({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          preferences: user.preferences,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching profile:", error)
      reply.status(401).send({
        success: false,
        error: "Invalid token",
      })
    }
  })

  // Update user preferences
  fastify.put("/auth/preferences", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "No token provided",
        })
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret")
      const { preferences } = request.body

      const user = await User.findByIdAndUpdate(decoded.userId, { $set: { preferences } }, { new: true }).select(
        "-password",
      )

      reply.send({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          preferences: user.preferences,
        },
      })
    } catch (error) {
      fastify.log.error("Error updating preferences:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to update preferences",
      })
    }
  })
}

module.exports = authRoutes
