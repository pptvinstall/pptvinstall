import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  schemaType?: 'LocalBusiness' | 'Service' | 'WebPage';
}

export function SEOHead({
  title = "Picture Perfect TV Install | Professional TV Mounting in Metro Atlanta",
  description = "Expert TV mounting and smart home installation services in Metro Atlanta. Licensed, insured technicians with same-day availability. Book your professional TV installation today!",
  keywords = "TV mounting Atlanta, TV installation Georgia, smart home installation, fireplace TV mount, professional TV mounting, Atlanta TV mounting service, Georgia TV installer, wall mount TV, TV mount service",
  canonical = "https://pptvinstall.com",
  ogTitle,
  ogDescription,
  ogImage = "https://pptvinstall.com/og-image.jpg",
  schemaType = "LocalBusiness"
}: SEOHeadProps) {
  
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta description
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'keywords', keywords);
    
    // Update Open Graph tags
    updateMetaTag('property', 'og:title', ogTitle || title);
    updateMetaTag('property', 'og:description', ogDescription || description);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'og:url', canonical);
    updateMetaTag('property', 'og:type', 'website');
    
    // Update Twitter Card tags
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', ogTitle || title);
    updateMetaTag('name', 'twitter:description', ogDescription || description);
    updateMetaTag('name', 'twitter:image', ogImage);
    
    // Update canonical link
    updateCanonicalLink(canonical);
    
    // Add structured data
    addStructuredData(schemaType);
    
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, schemaType]);

  function updateMetaTag(attribute: string, name: string, content: string) {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (element) {
      element.setAttribute('content', content);
    } else {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      element.setAttribute('content', content);
      document.head.appendChild(element);
    }
  }

  function updateCanonicalLink(url: string) {
    let link = document.querySelector('link[rel="canonical"]');
    
    if (link) {
      link.setAttribute('href', url);
    } else {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      document.head.appendChild(link);
    }
  }

  function addStructuredData(type: string) {
    // Remove existing structured data
    const existing = document.querySelector('script[type="application/ld+json"]');
    if (existing) {
      existing.remove();
    }

    let structuredData;

    if (type === 'LocalBusiness') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Picture Perfect TV Install",
        "description": "Professional TV mounting and smart home installation services in Metro Atlanta",
        "url": "https://pptvinstall.com",
        "telephone": "+1-404-702-4748",
        "address": {
          "@type": "PostalAddress",
          "addressRegion": "GA",
          "addressLocality": "Atlanta",
          "addressCountry": "US"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "33.7490",
          "longitude": "-84.3880"
        },
        "areaServed": {
          "@type": "State",
          "name": "Georgia"
        },
        "serviceArea": {
          "@type": "GeoCircle",
          "geoMidpoint": {
            "@type": "GeoCoordinates",
            "latitude": "33.7490",
            "longitude": "-84.3880"
          },
          "geoRadius": "50000"
        },
        "services": [
          {
            "@type": "Service",
            "name": "TV Wall Mounting",
            "description": "Professional TV mounting on all wall types including brick and stone"
          },
          {
            "@type": "Service", 
            "name": "Smart Home Installation",
            "description": "Complete smart home device setup and integration"
          },
          {
            "@type": "Service",
            "name": "Fireplace TV Installation", 
            "description": "Complex fireplace TV mounting with proper heat management"
          }
        ],
        "openingHours": [
          "Mo-Fr 18:30-22:30",
          "Sa-Su 11:00-19:00"
        ],
        "priceRange": "$75-$500",
        "image": "https://pptvinstall.com/logo.jpg",
        "sameAs": [
          "https://www.facebook.com/pictureperfecttvinstall",
          "https://www.instagram.com/pictureperfecttvinstall"
        ]
      };
    } else if (type === 'Service') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "TV Installation Service",
        "description": "Professional TV mounting and installation services",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Picture Perfect TV Install"
        },
        "areaServed": {
          "@type": "State", 
          "name": "Georgia"
        }
      };
    }

    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }

  return null;
}

export default SEOHead;