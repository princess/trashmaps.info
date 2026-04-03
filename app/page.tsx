import { Recycle } from 'lucide-react'
import TrashMapsClient from "@/components/trash-maps-client"

export default function TrashMapsHome() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Trash Maps",
              "url": "https://trashmaps.info",
              "description": "Interactive map to find public trash and recycling bins near you.",
              "applicationCategory": "Map",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Trash Maps Team",
                "url": "https://trashmaps.info"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Trash Maps",
              "url": "https://trashmaps.info",
              "logo": "https://trashmaps.info/placeholder-logo.png",
              "sameAs": []
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Trash Maps",
              "url": "https://trashmaps.info",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://trashmaps.info/?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How do I find public trash cans near me?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Simply open Trash Maps and allow location access. The interactive map will automatically show all public trash cans, recycling bins, and waste disposal points in your immediate vicinity."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Does Trash Maps show recycling bins?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Trash Maps displays various types of waste bins, including general waste, recycling (paper, plastic, glass), compost, and specialized disposal units."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Which countries are covered by Trash Maps?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Trash Maps provides global coverage, including over 150 countries and thousands of cities worldwide, using up-to-date mapping data."
                  }
                }
              ]
            }
          ])
        }}
      />
      
      {/* SEO Content Section (Visually Hidden but Crawlable) */}
      <section className="sr-only">
        <h1>Trash Maps - Find Public Trash and Recycling Bins Near You</h1>
        <p>
          Trash Maps is the ultimate interactive tool for finding nearby public waste disposal units. 
          Whether you're looking for a general trash can, a recycling point for glass or plastic, 
          or a compost bin, our global map has you covered.
        </p>
        <h2>Why use Trash Maps?</h2>
        <ul>
          <li>Find public trash cans in 150+ countries.</li>
          <li>Locate recycling bins for paper, plastic, and glass.</li>
          <li>Discover nearby compost and organic waste points.</li>
          <li>Accurate, real-time mapping of waste management infrastructure.</li>
        </ul>
        <h2>How it Works</h2>
        <p>
          Our interactive map uses location data to show you exactly where the nearest waste bins are located. 
          When you allow location access, the map centers on your current position. You can also use the 
          search bar to find recycling points in other cities or neighborhoods before you even get there.
          This makes Trash Maps the perfect companion for travelers, hikers, and anyone looking to keep 
          the streets clean.
        </p>
        <h2>Frequently Asked Questions</h2>
        <div>
          <h3>How do I find public trash cans near me?</h3>
          <p>Simply open Trash Maps and allow location access. The interactive map will automatically show all public trash cans, recycling bins, and waste disposal points in your immediate vicinity.</p>
          
          <h3>Does Trash Maps show recycling bins?</h3>
          <p>Yes, Trash Maps displays various types of waste bins, including general waste, recycling (paper, plastic, glass), compost, and specialized disposal units.</p>
          
          <h3>Which countries are covered by Trash Maps?</h3>
          <p>Trash Maps provides global coverage, including over 150 countries and thousands of cities worldwide, using up-to-date mapping data.</p>
        </div>
        <h2>Popular Locations</h2>
        <ul>
          <li>Find trash cans in New York, USA</li>
          <li>Recycling bins in London, UK</li>
          <li>Public bins in Paris, France</li>
          <li>Waste disposal in Berlin, Germany</li>
          <li>Trash maps for Tokyo, Japan</li>
          <li>Recycling points in Sydney, Australia</li>
          <li>Find bins in Toronto, Canada</li>
        </ul>
        <h2>Our Mission</h2>
        <p>
          Trash Maps is a community-driven initiative to help make our cities cleaner and more sustainable. 
          By providing a global, interactive map of public waste disposal and recycling points, we aim to 
          reduce littering and promote responsible waste management. Our data is powered by the OpenStreetMap 
          community and updated in real-time.
        </p>
      </section>

      <TrashMapsClient />

      {/* Minimal Bottom Banner */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm text-white py-2 px-4 border-t border-white/5">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 p-1 rounded-md">
              <Recycle className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Trash Maps</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="/privacy" 
              className="text-[11px] text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-[10px] text-gray-600 hidden sm:inline">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
