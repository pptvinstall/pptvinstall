
// Define the global types for Google Maps
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
      setCenter(latLng: LatLngLiteral | LatLng): void;
      setZoom(zoom: number): void;
      panTo(latLng: LatLngLiteral | LatLng): void;
      getBounds(): LatLngBounds;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLngLiteral | LatLng): void;
      setIcon(icon: string | Icon | Symbol): void;
    }
    
    class Circle {
      constructor(opts?: CircleOptions);
      setMap(map: Map | null): void;
      setCenter(latLng: LatLngLiteral | LatLng): void;
      setRadius(radius: number): void;
      setBounds(bounds: LatLngBounds): void;
    }
    
    class LatLngBounds {
      constructor(sw?: LatLngLiteral | LatLng, ne?: LatLngLiteral | LatLng);
      extend(latLng: LatLngLiteral | LatLng): LatLngBounds;
      getCenter(): LatLng;
    }
    
    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
    }
    
    // Enums
    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain'
    }
    
    enum Animation {
      BOUNCE = 1,
      DROP = 2
    }
    
    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4
    }
    
    // Interfaces
    interface MapOptions {
      center?: LatLngLiteral | LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      mapTypeId?: MapTypeId | string;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      styles?: MapTypeStyle[];
    }
    
    interface MarkerOptions {
      position: LatLngLiteral | LatLng;
      map?: Map;
      title?: string;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      draggable?: boolean;
      animation?: Animation;
    }
    
    interface CircleOptions {
      center?: LatLngLiteral | LatLng;
      radius?: number;
      map?: Map;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    interface Icon {
      url: string;
      size?: Size;
      origin?: Point;
      anchor?: Point;
      scaledSize?: Size;
    }
    
    interface Symbol {
      path: SymbolPath | string;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }
    
    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }
    
    interface Size {
      width: number;
      height: number;
    }
    
    interface Point {
      x: number;
      y: number;
    }
    
    interface MapTypeStyle {
      elementType?: string;
      featureType?: string;
      stylers: MapTypeStyler[];
    }
    
    interface MapTypeStyler {
      [k: string]: string | number | boolean;
    }
  }
}

interface LoaderOptions {
  apiKey: string;
  version?: string;
  libraries?: string[];
  language?: string;
  region?: string;
}

declare module '@googlemaps/js-api-loader' {
  export class Loader {
    constructor(options: LoaderOptions);
    load(): Promise<typeof google>;
  }
}
