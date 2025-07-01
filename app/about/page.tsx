import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-10 gradient-text">
          <Info className="inline-block h-10 w-10 mr-3 text-green-600" />
          About TrendWise
        </h1>
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              TrendWise is dedicated to bringing you the most relevant and up-to-date information on trending topics
              across the globe. We leverage cutting-edge AI technology to identify emerging trends and generate
              high-quality, SEO-optimized articles, ensuring you're always informed.
            </p>
            <p className="text-gray-700 mb-4">
              Our platform combines real-time data from various sources with advanced natural language generation to
              provide comprehensive and engaging content. We believe in the power of information to drive understanding
              and foster informed discussions.
            </p>
            <p className="text-gray-700">
              Join us on our journey to explore the ever-evolving landscape of trends and insights!
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
