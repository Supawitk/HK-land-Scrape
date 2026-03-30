export interface Zone {
  id: string;
  nameEn: string;
  nameZh: string;
}

export interface District {
  id: string;
  zoneId: string;
  nameEn: string;
  nameZh: string;
  centroidLat: number | null;
  centroidLng: number | null;
  areaKmSq: number | null;
}

export interface Property {
  id: number;
  externalId: string;
  listingType: "buy" | "rent";
  districtId: string | null;
  estateName: string | null;
  address: string | null;
  price: number | null;
  pricePerSqft: number | null;
  areaBuild: number | null;
  areaUsable: number | null;
  bedrooms: number | null;
  propertyType: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  scrapedAt: number;
  createdAt: number;
}

export interface MtrStation {
  id: string;
  nameEn: string;
  nameZh: string;
  lat: number;
  lng: number;
  districtId: string | null;
}

export interface MtrLine {
  id: string;
  nameEn: string;
  nameZh: string;
  color: string;
}

export interface BusStop {
  id: string;
  operator: "kmb" | "ctb";
  nameEn: string;
  nameZh: string;
  lat: number;
  lng: number;
  districtId: string | null;
}

export interface TramStop {
  id: string;
  nameEn: string;
  nameZh: string | null;
  lat: number;
  lng: number;
  districtId: string | null;
}

export interface PopulationData {
  districtId: string;
  year: number;
  population: number;
  male: number | null;
  female: number | null;
}

export interface PriceIndex {
  period: string;
  propertyClass: string | null;
  priceIndex: number | null;
}

export interface PropertyFilters {
  listingType?: "buy" | "rent";
  districtId?: string;
  zoneId?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  bedrooms?: number;
  page?: number;
  limit?: number;
  sortBy?: "price" | "area" | "date";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DistrictStats {
  districtId: string;
  districtName: string;
  avgPrice: number | null;
  avgPricePerSqft: number | null;
  totalListings: number;
  avgArea: number | null;
}

export interface NearbyTransport {
  mtrStations: MtrStation[];
  busStops: BusStop[];
  tramStops: TramStop[];
}
