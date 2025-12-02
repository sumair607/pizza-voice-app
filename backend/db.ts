
import { SettingsPayload } from '../types';

// Base template for any new shop that opens via the URL
export const defaultShopTemplate: Omit<SettingsPayload, 'id'> = {
  shopInfo: {
    name: 'New Pizza Shop', // Will be overwritten by URL param formatted
    salesDeskWhatsapp: '+923000000000',
    adminKey: '123456', // DEFAULT SECRET KEY
    workingHours: { start: '11:00', end: '23:00' },
    about: 'We serve the best pizza in town with fresh ingredients and love.',
    disclaimer: 'Delivery times are estimates. Prices subject to change without notice.',
    faqs: [
        { question: 'Do you offer home delivery?', answer: 'Yes, we deliver to selected zones.' },
        { question: 'Is the meat Halal?', answer: 'Yes, 100% Halal certified.' }
    ]
  },
  pizzas: [
    { name: 'Chicken Tikka', sizes: { Regular: 950, Large: 1400 } },
    { name: 'Chicken Fajita', sizes: { Regular: 950, Large: 1400 } },
    { name: 'Margherita', sizes: { Regular: 850, Large: 1200 } },
    { name: 'Veggie Supreme', sizes: { Regular: 900, Large: 1300 } },
  ],
  drinks: [
    { name: 'Coke', sizes: { Regular: 100, Large: 150 } },
    { name: 'Sprite', sizes: { Regular: 100, Large: 150 } },
    { name: 'Water', sizes: { Small: 60, Large: 100 } },
  ],
  deals: [
    { name: 'Mega Deal', description: '1 Large Pizza + 1.5L Drink', price: 1500 },
    { name: 'Family Feast', description: '2 Large Pizzas + 2 Drinks', price: 3200 },
  ],
  riders: [
    { name: 'Rider 1', number: '0300-1111111' },
    { name: 'Rider 2', number: '0300-2222222' },
  ],
  allowedZones: ['Downtown', 'Gulshan', 'DHA'],
};

// Function to generate 50 pre-configured shops
const generatePreconfiguredShops = () => {
    const shops: Record<string, Partial<SettingsPayload>> = {};

    // 1. Keep the original demo shop
    shops['cheesy_occean'] = {
        shopInfo: {
            ...defaultShopTemplate.shopInfo,
            name: 'Cheesy Occean Pizza',
            salesDeskWhatsapp: '+923001234567',
            adminKey: 'cheesy123' 
        },
        riders: [
            { name: 'Ali Khan', number: '0300-1111111' },
            { name: 'Babar Azam', number: '0300-2222222' },
        ]
    };

    // 2. Generate Shop 01 to Shop 50
    for (let i = 1; i <= 50; i++) {
        // Format ID: shop01, shop02, ... shop50
        const id = i < 10 ? `shop0${i}` : `shop${i}`;
        
        // Format Key: key_shop01, key_shop02, etc.
        const secretKey = `key_${id}`;

        shops[id] = {
            shopInfo: {
                ...defaultShopTemplate.shopInfo,
                name: `Shop ${id.toUpperCase()} (Unclaimed)`,
                salesDeskWhatsapp: '',
                adminKey: secretKey
            },
            // They will inherit pizzas/drinks/riders from defaultShopTemplate automatically via api.ts
        };
    }

    return shops;
};

export const preconfiguredShops: Record<string, Partial<SettingsPayload>> = generatePreconfiguredShops();
