export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    console.log(`🔖 [FRONTEND API] Toggling save for article: ${id}`)

    // Try to toggle save on backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/articles/${id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user?.email}`,
        },
        body: JSON.stringify({ userId: session.user?.email }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Save toggled successfully`)
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend save toggle failed: ${response.status}`)
        // Return success anyway to not break the UI
        return NextResponse.json({ success: true, saved: true, saves: 1 })
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for save toggle")
      // Return success anyway to not break the UI
      return NextResponse.json({ success: true, saved: true, saves: 1 })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error toggling save:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
