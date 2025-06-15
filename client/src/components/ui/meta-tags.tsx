import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
}

export function MetaTags({
  title = "Picture Perfect TV Install | Professional TV Mounting in Atlanta",
  description = "Get expert TV mounting and smart home installation services in Atlanta. Book now for secure, professional installation at affordable rates!",
  image = "/generated-icon.png",
  url,
  type = "website",
  keywords = "TV mounting Atlanta, TV installation, smart home installation, fireplace TV mount, professional TV mounting, Atlanta TV mounting service"
}: MetaTagsProps) {
  
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };
    
    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:image', image, true);
    
    if (url) {
      updateMetaTag('og:url', url, true);
    }
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    
    // Additional SEO tags
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('author', 'Picture Perfect TV Install');
    updateMetaTag('geo.region', 'US-GA');
    updateMetaTag('geo.placename', 'Atlanta');
    
  }, [title, description, image, url, type, keywords]);
  
  return null; // This component doesn't render anything
}

// Predefined meta configurations for different pages
export const META_CONFIGS = {
  home: {
    title: "Picture Perfect TV Install | Professional TV Mounting in Atlanta",
    description: "Get expert TV mounting and smart home installation services in Atlanta. Book now for secure, professional installation at affordable rates!",
    keywords: "TV mounting Atlanta, TV installation, smart home installation, fireplace TV mount, professional TV mounting, Atlanta TV mounting service"
  },
  
  booking: {
    title: "Book TV Installation | Picture Perfect TV Install",
    description: "Book your professional TV mounting and smart home installation appointment online. Same-day service available in Metro Atlanta.",
    keywords: "book TV installation, schedule TV mounting, Atlanta TV installer, online booking, TV mount appointment"
  },
  
  services: {
    title: "TV Mounting & Smart Home Services | Picture Perfect TV Install",
    description: "Professional TV mounting, fireplace installations, and smart home device setup. Serving Metro Atlanta with expert installation services.",
    keywords: "TV mounting services, fireplace TV installation, smart home setup, professional TV installer, Atlanta home services"
  },
  
  contact: {
    title: "Contact Us | Picture Perfect TV Install",
    description: "Get in touch with Atlanta's premier TV installation service. Call 404-702-4748 for quotes and scheduling.",
    keywords: "contact TV installer, Atlanta TV mounting, professional installation quote, TV mount service"
  },
  
  gallery: {
    title: "Installation Gallery | Picture Perfect TV Install",
    description: "View our professional TV mounting and smart home installation work. See why Atlanta customers choose Picture Perfect TV Install.",
    keywords: "TV installation gallery, Atlanta TV mounting examples, professional installation photos, TV mount portfolio"
  }
};