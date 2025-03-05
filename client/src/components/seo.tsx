
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  keywords?: string;
  noIndex?: boolean;
}

export default function SEO({
  title = "Professional TV & Smart Home Installation",
  description = "Expert TV mounting and smart home device installation services. Doorbell cameras, security cameras, and floodlight installation in Atlanta.",
  canonical = "",
  image = "/images/logo.png",
  type = "website",
  keywords = "TV mounting, smart home installation, doorbell installation, camera installation, Atlanta",
  noIndex = false,
}: SEOProps) {
  const siteTitle = "Picture Perfect TV Install";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical Link */}
      {canonical && <link rel="canonical" href={`https://pictureperfecttvinstall.com${canonical}`} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={`https://pictureperfecttvinstall.com${canonical}`} />
      <meta property="og:image" content={`https://pictureperfecttvinstall.com${image}`} />
      <meta property="og:site_name" content={siteTitle} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`https://pictureperfecttvinstall.com${image}`} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
    </Helmet>
  );
}
