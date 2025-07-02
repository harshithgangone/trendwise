import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"
    const body = await request.json()

    try {
      console.log("🔄 [FRONTEND API] Toggling bot status...")
      const apiUrl = `${backendUrl}/api/admin/toggle-bot`
      console.log("🔗 [FRONTEND API] Toggle Bot API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully toggled bot status")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for bot toggle:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({ success: false, error: "Backend not available" }, { status: 503 })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error toggling bot:", error)
    return NextResponse.json({ success: false, error: "Failed to toggle bot" }, { status: 500 })
  }
}
