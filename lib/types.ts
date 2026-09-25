export type ProductCategory = "Freestyle" | "Race" | "Cruiser" | "Kids";

export type BmxBike = {
  id: string;
  brand: string;
  model: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: ProductCategory;
  ridingStyle: string[];
  wheelSize: string;
  topTube: string;
  frameMaterial: string;
  skillLevel: string;
  rating: number;
  reviewCount: number;
  badge: string;
  image: string;
  gallery: string[];
  colors: string[];
  sizes: string[];
  description: string;
  specs: Record<string, string>;
};
