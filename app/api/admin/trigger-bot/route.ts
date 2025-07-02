import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🚀 [FRONTEND API] Triggering bot manually...")
      const apiUrl = `${backendUrl}/api/admin/trigger-bot`
      console.log("🔗 [FRONTEND API] Trigger Bot API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(30000), // 30 seconds for bot trigger
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully triggered bot")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for bot trigger:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({ success: false, error: "Backend not available" }, { status: 503 })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error triggering bot:", error)
    return NextResponse.json({ success: false, error: "Failed to trigger bot" }, { status: 500 })
  }
}
