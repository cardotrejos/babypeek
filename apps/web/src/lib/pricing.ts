// Price from env or default $9.99
export const PRICE_CENTS = Number(import.meta.env.VITE_PRODUCT_PRICE_CENTS) || 999;
export const PRICE_DISPLAY = `$${(PRICE_CENTS / 100).toFixed(2)}`;
