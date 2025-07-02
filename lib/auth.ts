import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Save user to backend database
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

          const response = await fetch(`${backendUrl}/api/auth/google-signin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: user.name,
              email: user.email,
              image: user.image,
              provider: account.provider,
              providerId: account.providerAccountId,
            }),
          })

          if (response.ok) {
            const userData = await response.json()
            console.log("✅ [AUTH] User saved to backend:", userData.email)
            return true
          } else {
            console.error("❌ [AUTH] Failed to save user to backend:", response.status)
            return true // Still allow sign in even if backend fails
          }
        } catch (error) {
          console.error("❌ [AUTH] Error saving user to backend:", error)
          return true // Still allow sign in even if backend fails
        }
      }
      return true
    },
    async session({ session, token }) {
      // Add user ID to session if available
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in
      const callbackUrl = new URL(url).searchParams.get("callbackUrl")
      if (callbackUrl) {
        try {
          const callbackURL = new URL(callbackUrl, baseUrl)
          if (callbackURL.origin === baseUrl) {
            return callbackURL.toString()
          }
        } catch {
          // Invalid URL, fall back to base URL
        }
      }
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
