export interface GeminiParsedOrder {
  name: string;
  email: string;
  products: {
    product: string;
    quantity: number | null;
    price: number | null;
  }[];
}

export interface MatchedLineItem {
  title: string;
  variant_id: number;
  quantity: number;
  price: string;
}
