"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArticleContent } from "@/components/article-content"

export default function SafeArticleContent({ article }: { article: any }) {
  const router = useRouter()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // If it's a Next.js <a> tag inside a <Link>
      if (target.tagName === "A" && target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href")
        if (href && href.startsWith("/")) {
          e.preventDefault()
          router.push(href)
        }
      }
    }

    document.addEventListener("click", handleClick)

    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [router])

  return <ArticleContent article={article} />
}
