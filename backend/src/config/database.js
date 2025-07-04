const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      return mongoose
    }

    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb+srv://harshithmongo:HARSHAMDB1234@cluster0.kkwkg.mongodb.net/trendwise",
      {
        // useNewUrlParser and useUnifiedTopology are deprecated and have no effect since Node.js Driver version 4.0.0
        // Remove them to clear warnings
      },
    )

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    return mongoose
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    throw error
  }
}

// Export both the connection function and mongoose instance
module.exports = { connectDB, mongoose }