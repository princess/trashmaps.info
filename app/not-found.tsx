import Link from 'next/link'
import { Recycle } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="bg-green-600 p-4 rounded-2xl shadow-lg animate-bounce">
            <Recycle className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-6xl font-black text-green-800 tracking-tighter">404</h1>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Whoops! This bin is empty.
          </h2>
          <p className="mx-auto max-w-xs text-gray-600">
            We couldn't find the page you were looking for. It might have been recycled or moved.
          </p>
        </div>

        <div className="pt-6">
          <Button 
            asChild
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            <Link href="/">
              Return to Map
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Looking for a trash can? We've got thousands of them on the map!</p>
        </div>
      </div>
    </div>
  )
}
