import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  ogImage?: string;
  canonicalPath?: string;
  schemaData?: Record<string, any>;
}

export function SEO({
  title,
  description,
  keywords,
  ogType = 'website',
  ogImage = '/logo.svg',
  canonicalPath,
  schemaData,
}: SEOProps) {
  useEffect(() => {
    const siteName = 'Tanoedu AI';
    const fullTitle = `${title} | ${siteName}`;
    const baseUrl = 'https://tanoedu-ai.web.app';
    const pageUrl = canonicalPath ? `${baseUrl}${canonicalPath}` : window.location.href;
    const resolvedOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

    // 1. Update Title
    document.title = fullTitle;

    // Helper to set or create meta tags
    const setMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (element) {
        element.setAttribute('content', contentValue);
      } else {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        element.setAttribute('content', contentValue);
        document.head.appendChild(element);
      }
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }
    setMetaTag('name', 'author', 'Tanoedu AI Team');

    // 3. Open Graph / Facebook Meta Tags
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', resolvedOgImage);
    setMetaTag('property', 'og:url', pageUrl);
    setMetaTag('property', 'og:site_name', siteName);

    // 4. Twitter Meta Tags
    setMetaTag('name', 'twitter:card', 'summary');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', resolvedOgImage);

    // 5. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', pageUrl);
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', pageUrl);
      document.head.appendChild(canonicalLink);
    }

    // 6. JSON-LD Schema
    const schemaId = 'tanoedu-seo-jsonld';
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement | null;
    
    if (schemaData) {
      const formattedSchema = {
        '@context': 'https://schema.org',
        ...schemaData,
      };

      if (schemaScript) {
        schemaScript.textContent = JSON.stringify(formattedSchema);
      } else {
        schemaScript = document.createElement('script');
        schemaScript.id = schemaId;
        schemaScript.type = 'application/ld+json';
        schemaScript.textContent = JSON.stringify(formattedSchema);
        document.head.appendChild(schemaScript);
      }
    } else {
      // Remove old schema if none provided for this page
      schemaScript?.remove();
    }

    // Cleanup logic (optional, but good for keeping headers clean on unmount)
    return () => {
      // We keep page title as is, but we can remove the dynamic script if we navigate away
      const currentSchema = document.getElementById(schemaId);
      currentSchema?.remove();
    };
  }, [title, description, keywords, ogType, ogImage, canonicalPath, schemaData]);

  return null; // This component handles side effects, no layout footprint
}
