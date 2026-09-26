export interface PaymentMethod {
  id: string;
  label: string;
  hint: string;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "cashapp", label: "Cash App", hint: "$Cashtag or phone number" },
  { id: "chime", label: "Chime", hint: "Chime handle or email" },
  { id: "Zelle", label: "Zelle", hint: "Email or mobile number" },
  { id: "paypal", label: "PayPal", hint: "PayPal email" },
  { id: "applepay", label: "Apple Pay", hint: "Confirm with your device" },
  { id: "venmo", label: "Venmo", hint: "Venmo username" },
  { id: "crypto", label: "Crypto (BTC or USDT)", hint: "BTC or USDT wallet" },
  { id: "payid", label: "PayID", hint: "Your PayID handle" },
  { id: "bank", label: "Bank transfer", hint: "Wire or ACH transfer" },
  { id: "card", label: "Credit card", hint: "Card payment link" },
  { id: "etransfer", label: "E-Transfer", hint: "Bank e-Transfer / Interac" }
] as const;

export const DEFAULT_PAYMENT_METHOD = "cashapp";

export type ContactChannel = "whatsapp" | "email";

export interface PaymentRequestLine {
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentRequestInput {
  storeName: string;
  orderReference: string;
  paymentMethod: string;
  currency: string;
  total: number;
  items: PaymentRequestLine[];
  customerName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingAddress: string;
}

export function paymentMethodLabel(id: string): string {
  return PAYMENT_METHODS.find((method) => method.id === id)?.label ?? id;
}

export function isPaymentMethod(value: unknown): value is string {
  return typeof value === "string" && PAYMENT_METHODS.some((method) => method.id === value);
}

export function isContactChannel(value: unknown): value is ContactChannel {
  return value === "whatsapp" || value === "email";
}

function formatAmount(value: number): string {
  const [whole, cents] = value.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${cents}`;
}

function money(value: number, currency: string): string {
  const code = currency.trim().toUpperCase();
  const amount = formatAmount(value);
  return code && code !== "USD" ? `${code}${amount}` : `$${amount}`;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim() || "Not provided";
}

export function buildPaymentRequestMessage(input: PaymentRequestInput): string {
  const itemLines = input.items.length
    ? input.items.map((item) => `  - ${item.name} x ${item.quantity} (${money(item.price, input.currency)})`)
    : ["  - (no items recorded)"];

  return [
    "Hi, I'd like to complete my payment for an order on " + oneLine(input.storeName) + ".",
    "",
    "Order ID: #" + oneLine(input.orderReference),
    "Payment Method: " + oneLine(input.paymentMethod),
    `Total: ${money(input.total, input.currency)}`,
    "",
    "Items:",
    ...itemLines,
    "",
    "Customer Name: " + oneLine(input.customerName),
    "Email: " + oneLine(input.email),
    "Phone: " + oneLine(input.phone),
    "Shipping Address: " + oneLine(input.shippingAddress),
    "Billing Address: " + oneLine(input.billingAddress),
    "",
    "Please send me the payment instructions for " + oneLine(input.paymentMethod) + ". Thank you!"
  ].join("\n");
}

export function whatsappNumberDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${whatsappNumberDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export function buildEmailUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
