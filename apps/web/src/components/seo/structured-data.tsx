/**
 * StructuredData Component
 * Renders JSON-LD structured data for SEO.
 *
 * Includes:
 * - WebSite schema with site information
 * - Organization schema with branding
 *
 * @see Story 2.6 - SEO Optimization
 * @see https://schema.org/WebSite
 * @see https://schema.org/Organization
 */

interface StructuredDataProps {
  siteUrl: string;
  siteName: string;
  description: string;
}

export function StructuredData({ siteUrl, siteName, description }: StructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: description,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}og-image.png`,
        },
        description: description,
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#app`,
        name: siteName,
        url: siteUrl,
        applicationCategory: "PhotographyApplication",
        operatingSystem: "Web",
        description: description,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
