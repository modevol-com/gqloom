import "./global.css"
import Link from "next/link"

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main className="flex flex-col items-center justify-center h-screen bg-slate-950 text-neutral-100 space-y-6 px-4">
          <div className="text-center space-y-4 relative">
            <h1 className="text-9xl font-bold bg-gradient-to-r from-amber-400 to-rose-600 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-orange-100">
              Page Not Found
            </h2>
            <p className="text-amber-100/60 max-w-md">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <Link
            href="/"
            className="bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-3 rounded-full 
                      font-medium hover:scale-105 transition-transform duration-200
                      flex items-center gap-2 group shadow-lg hover:shadow-orange-500/20"
          >
            <span>Back to Home</span>
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <div className="absolute inset-0 overflow-hidden opacity-60 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute size-1 bg-rose-300/60 rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float ${Math.random() * 8 + 4}s infinite`,
                }}
              />
            ))}
          </div>
        </main>
      </body>
    </html>
  )
}
