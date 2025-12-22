/**
 * Vercel Edge Function for Social Media OG Meta Tags
 * Story 8.4: Share Page with Watermarked Preview (AC-4)
 *
 * Serves HTML with dynamic OG meta tags for social media crawlers
 * (WhatsApp, iMessage, Facebook, Twitter, etc.)
 *
 * Route: /api/og/:shareId
 */

export const config = {
  runtime: "edge",
}

// Social media crawler User-Agent patterns
const CRAWLER_PATTERNS = [
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /WhatsApp/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Pinterest/i,
  /Googlebot/i,
  /bingbot/i,
  /Applebot/i,
  /iMessageLinkPreview/i,
]

const API_BASE_URL = process.env.VITE_API_URL || "https://3d-ultra-server.vercel.app"
const SITE_URL = process.env.VITE_SITE_URL || "https://babypeek.io"

interface ShareData {
  shareId: string
  uploadId: string
  previewUrl: string
}

async function fetchShareData(shareId: string): Promise<ShareData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/share/${shareId}`, {
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

function generateOgHtml(shareData: ShareData | null, shareId: string): string {
  const title = "See what AI created from an ultrasound! 👶✨"
  const description =
    "Someone turned their ultrasound into this beautiful baby portrait. Create your own for free!"
  const imageUrl = shareData?.previewUrl || `${SITE_URL}/og-image.png`
  const pageUrl = `${SITE_URL}/share/${shareId}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | BabyPeek</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="BabyPeek">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- WhatsApp / iMessage specific -->
  <meta property="og:image:alt" content="AI-generated baby portrait preview">
  
  <!-- Redirect to SPA for users who click through -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
  <link rel="canonical" href="${pageUrl}">
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">BabyPeek</a>...</p>
</body>
</html>`
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathParts = url.pathname.split("/")
  const shareId = pathParts[pathParts.length - 1]

  if (!shareId) {
    return new Response("Share ID required", { status: 400 })
  }

  // Fetch share data and generate HTML
  const shareData = await fetchShareData(shareId)
  const html = generateOgHtml(shareData, shareId)

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
    },
  })
}
