export interface Location {
    locationName: string;
    latitude: string;
    longitude: string;
}

export interface Image {
    filename: string;
  commons_url: string;
  original_url?: string;
  thumbnails?: {
    width: number;
    height: number;
    url: string;
  } | null;
  srcset: string[];
}

export interface Collection {
    id: string;
    name: string;
    desc: string;
    location: Location;
    image: Image | null;
}
