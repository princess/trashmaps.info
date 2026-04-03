import type { Metadata } from 'next'
import Link from 'next/link'
import { Recycle, ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: 'Privacy Policy | Trash Maps',
  description: 'Our privacy policy explains how we collect, use, and safeguard your information on Trash Maps.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://trashmaps.info"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Privacy Policy",
                "item": "https://trashmaps.info/privacy"
              }
            ]
          })
        }}
      />
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg">
              <Recycle className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-green-800 tracking-tight">Trash Maps</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Map
            </Link>
          </Button>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium">Last Updated: April 3, 2026</p>

        <div className="prose prose-green max-w-none space-y-6 text-gray-600">
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">1. Introduction</h2>
            <p>
              Welcome to Trash Maps (https://trashmaps.info). We are committed to protecting your privacy and ensuring a safe user experience. This Privacy Policy explains how we collect, use, and safeguard your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Information We Collect</h2>
            <p>
              <strong>Location Data:</strong> We request access to your device's location to show nearby trash and recycling bins. This data is processed locally on your device or via approximate GeoIP lookup and is not stored on our servers.
            </p>
          </section>

          <section className="bg-green-50 p-6 rounded-xl border border-green-100">
            <h2 className="text-2xl font-bold text-green-900 mb-3">3. Google AdSense & Cookies</h2>
            <p className="mb-4">
              We use Google AdSense to serve ads when you visit our website. Google uses cookies to serve ads based on your prior visits to this or other websites.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our sites and/or other sites on the Internet.</li>
              <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">Ads Settings</a>.</li>
              <li>Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">www.aboutads.info</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">4. Log Data</h2>
            <p>
              Like most website operators, we collect information that your browser sends whenever you visit our site ("Log Data"). This may include information such as your device's Internet Protocol ("IP") address, browser type, and browser version.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} Trash Maps. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
