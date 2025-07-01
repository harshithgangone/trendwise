import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params

    console.log(`📰 [ARTICLE API] Fetching article with slug: "${slug}"`)

    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      const response = await fetch(`${backendUrl}/api/articles/${slug}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [ARTICLE API] Article found: "${data.title}"`)
        return NextResponse.json(data)
      } else {
        console.log(`❌ [ARTICLE API] Backend responded with status: ${response.status}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [ARTICLE API] Backend not available, article not found")
      return NextResponse.json(
        {
          success: false,
          error: "Article not found",
          message: "The requested article could not be found. It may have been removed or the URL is incorrect.",
        },
        { status: 404 },
      )
    }
  } catch (error) {
    console.error("❌ [ARTICLE API] Error in article route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article",
        message: "An error occurred while fetching the article. Please try again later.",
      },
      { status: 500 },
    )
  }
}
