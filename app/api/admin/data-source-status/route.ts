import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try to get status from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      const response = await fetch(`${backendUrl}/api/admin/data-source-status`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      console.log("Backend not available for data source status")
    }

    // Fallback response
    return NextResponse.json({
      isRealData: false,
      source: "fallback",
      lastUpdate: new Date().toISOString(),
      articlesCount: 0,
      message: "Backend not available",
    })
  } catch (error) {
    console.error("Error checking data source status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check data source status",
      },
      { status: 500 },
    )
  }
}
