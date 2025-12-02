import React from 'react';
import { OrderDetails } from '../types';
import { HistoryIcon } from './icons';

interface OrderHistoryProps {
  orders: OrderDetails[];
  onClose: () => void;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-indigo-500/30"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <HistoryIcon className="w-6 h-6 mr-3 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Order History</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{order.orderTimestamp.toLocaleString()}</p>
                    </div>
                    <p className="text-lg font-bold text-green-400">Rs.{order.total.toFixed(2)}</p>
                  </div>
                  <ul className="text-sm text-gray-300 list-disc list-inside">
                    {order.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-400">No delivered orders yet.</p>
              <p className="text-sm text-gray-500">Complete an order to see it here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OrderHistory;