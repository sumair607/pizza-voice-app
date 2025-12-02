
export interface Message {
  speaker: 'user' | 'model';
  text: string;
}

export interface Rider {
  name: string;
  number: string;
}

export interface WorkingHours {
    start: string; // e.g. "11:00"
    end: string;   // e.g. "23:00"
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface ShopInfo {
    name: string;
    salesDeskWhatsapp: string;
    adminKey: string; // Secret key to access dashboard
    workingHours: WorkingHours;
    about: string;
    disclaimer: string;
    faqs: FAQItem[];
}

export interface MenuItem {
    name: string;
    // e.g., { "Regular": 12, "Large": 18 }
    sizes: Record<string, number>; 
}

export interface Deal {
    name: string;
    description: string;
    price: number;
}

export enum OrderStatus {
  PLACED = 'Order Placed',
  PREPARING = 'Preparing',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELED = 'Canceled',
}

export interface OrderDetails {
  id: string; // Unique identifier from Firestore
  customerName: string;
  address: string;
  whatsappNumber: string;
  items: string[];
  total: number;
  paymentMethod: 'Cash on Delivery' | 'Card' | string; // Allow specific strings or a general one
  specialInstructions?: string; // New field
  orderTimestamp: Date;
  expectedDeliveryTime: Date | null;
  assignedRider: Rider;
  status: OrderStatus;
}

export enum SessionStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface SettingsPayload {
  id?: string;
  shopInfo: ShopInfo;
  pizzas: MenuItem[];
  drinks: MenuItem[];
  deals: Deal[];
  riders: Rider[];
  allowedZones: string[];
}
