
import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  limit,
} from 'firebase/firestore';
import { OrderDetails, OrderStatus, SettingsPayload } from '../types';
import { defaultShopTemplate, preconfiguredShops } from './db';

// --- HELPER: Get Shop ID from URL ---
// Looks for ?shop=my_shop_name in the URL. Defaults to 'cheesy_occean' if missing.
export const getCurrentShopId = (): string => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop') || 'cheesy_occean';
};

// Helper to format a slug into a nice name (e.g. 'pizza_hut' -> 'Pizza Hut')
const formatShopName = (slug: string): string => {
    return slug.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- PATH GENERATORS ---
// These ensure we access the correct collection for the specific shop
const getShopDocRef = (shopId: string) => doc(db, 'shops', shopId, 'settings', 'main');
const getOrdersCollectionRef = (shopId: string) => collection(db, 'shops', shopId, 'orders');


// --- Helper to convert Firestore doc to OrderDetails ---
const fromFirestore = (doc: any): OrderDetails => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        orderTimestamp: (data.orderTimestamp as Timestamp).toDate(),
        expectedDeliveryTime: data.expectedDeliveryTime ? (data.expectedDeliveryTime as Timestamp).toDate() : null,
    } as OrderDetails;
}


// --- API Functions ---

export const getSettings = async (): Promise<SettingsPayload> => {
  const shopId = getCurrentShopId();
  console.log(`Firebase API: Fetching settings for shop [${shopId}]...`);
  
  const settingsDocRef = getShopDocRef(shopId);
  const docSnap = await getDoc(settingsDocRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as SettingsPayload;
  } else {
    // Shop doesn't exist yet! Let's create it dynamically.
    console.log(`Firebase API: Shop [${shopId}] not found. Creating new shop instance...`);
    
    let newShopData = { ...defaultShopTemplate };
    
    // If we have specific overrides in db.ts, use them
    if (preconfiguredShops[shopId]) {
        newShopData = { ...newShopData, ...preconfiguredShops[shopId] };
    } else {
        // Otherwise just set the name based on the URL
        newShopData.shopInfo.name = formatShopName(shopId);
    }

    await setDoc(settingsDocRef, newShopData);
    return { id: 'main', ...newShopData };
  }
};

export const getOrderHistory = async (): Promise<OrderDetails[]> => {
    const shopId = getCurrentShopId();
    const ordersRef = getOrdersCollectionRef(shopId);
    const q = query(ordersRef, orderBy('orderTimestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(fromFirestore);
};

export const saveOrderToHistory = async (order: Omit<OrderDetails, 'id'>): Promise<string> => {
    const shopId = getCurrentShopId();
    try {
      const docRef = await addDoc(getOrdersCollectionRef(shopId), order);
      return docRef.id;
    } catch (e) {
      console.error("Error adding document: ", e);
      throw e;
    }
};

export const updateOrderStatusInHistory = async (orderId: string, newStatus: OrderStatus): Promise<void> => {
    const shopId = getCurrentShopId();
    // Note: We need to find the specific doc within the shop's subcollection
    const orderDocRef = doc(db, 'shops', shopId, 'orders', orderId);
    try {
        await updateDoc(orderDocRef, { status: newStatus });
    } catch (e) {
        console.error("Error updating order status:", e);
        throw e;
    }
};

export const saveSettings = async (settingsPayload: SettingsPayload): Promise<void> => {
    const shopId = getCurrentShopId();
    const { id, ...settingsData } = settingsPayload;
    const settingsDocRef = getShopDocRef(shopId);
    await setDoc(settingsDocRef, settingsData);
};


// --- Real-time Listeners ---

export const listenToActiveOrders = (callback: (orders: OrderDetails[]) => void): Unsubscribe => {
    const shopId = getCurrentShopId();
    const ordersRef = getOrdersCollectionRef(shopId);
    
    const q = query(
        ordersRef,
        orderBy('orderTimestamp', 'desc'),
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const allRecentOrders = querySnapshot.docs.map(fromFirestore);
        const activeStatuses = [OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY];
        
        const activeOrders = allRecentOrders
            .filter(order => activeStatuses.includes(order.status))
            .sort((a, b) => a.orderTimestamp.getTime() - b.orderTimestamp.getTime());

        callback(activeOrders);
    }, (error) => {
        console.error("Error listening to active orders: ", error);
    });

    return unsubscribe;
}

export const listenToOrderUpdates = (orderId: string, callback: (order: OrderDetails) => void): Unsubscribe => {
    const shopId = getCurrentShopId();
    const orderDocRef = doc(db, 'shops', shopId, 'orders', orderId);

    const unsubscribe = onSnapshot(orderDocRef, (doc) => {
        if (doc.exists()) {
            callback(fromFirestore(doc));
        }
    }, (error) => {
        console.error(`Error listening to order ${orderId}: `, error);
    });

    return unsubscribe;
}
