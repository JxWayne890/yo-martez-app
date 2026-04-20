export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  email_marketing_consent: {
    state: "subscribed" | "not_subscribed" | "unsubscribed" | "pending" | "redacted";
    opt_in_level: string;
    consent_updated_at: string | null;
  } | null;
  default_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string | null;
  variant_id: number | null;
  quantity: number;
  price: string;
}

export interface ShopifyCheckout {
  id: number;
  token: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  abandoned_checkout_url: string;
  total_price: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  billing_address?: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  line_items: ShopifyLineItem[];
}

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
}

export interface ShopifyDraftOrder {
  id: number;
  email: string;
  name: string;
  status: string;
  invoice_url: string;
  customer: {
    id: number;
    first_name: string;
    default_address: {
      first_name: string;
    };
  };
}

export interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  checkout_token: string | null;
  line_items: ShopifyLineItem[];
}
