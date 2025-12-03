
import React, { useState, useEffect } from 'react';
import { OrderDetails, OrderStatus } from '../types';
import * as api from '../backend/api';
import { LoadingSpinner, CheckCircleIcon, PizzaIcon, DeliveryIcon } from './icons';

const OrderCard: React.FC<{ order: OrderDetails }> = ({ order }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await api.updateOrderStatusInHistory(order.id, newStatus);
    } catch (err) {
      console.error(`Failed to update order ${order.id}`, err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextAction = () => {
    switch (order.status) {
      case OrderStatus.PLACED:
        return {
          label: 'Start Preparing',
          action: () => handleUpdateStatus(OrderStatus.PREPARING),
          icon: <PizzaIcon className="w-5 h-5 mr-2" />,
          className: 'bg-yellow-600 hover:bg-yellow-500',
        };
      case OrderStatus.PREPARING:
        return {
          label: 'Send for Delivery',
          action: () => handleUpdateStatus(OrderStatus.OUT_FOR_DELIVERY),
          icon: <DeliveryIcon className="w-5 h-5 mr-2" />,
          className: 'bg-blue-600 hover:bg-blue-500',
        };
      case OrderStatus.OUT_FOR_DELIVERY:
        return {
          label: 'Mark as Delivered',
          action: () => handleUpdateStatus(OrderStatus.DELIVERED),
          icon: <CheckCircleIcon className="w-5 h-5 mr-2" />,
          className: 'bg-green-600 hover:bg-green-500',
        };
      default:
        return null;
    }
  };

  const action = getNextAction();
  const timeSinceOrder = (new Date().getTime() - order.orderTimestamp.getTime()) / 1000 / 60; // in minutes

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-md w-full animate-fade-in-up">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white text-lg">{order.customerName}</h3>
          <p className="text-xs text-blue-300">📱 {order.whatsappNumber}</p>
          <p className="text-xs text-gray-400">📍 {order.address}</p>
          <p className="text-xs text-green-300">🏍️ {order.assignedRider.name} ({order.assignedRider.number})</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-400 text-lg">Rs.{order.total.toFixed(2)}</p>
          <p className="text-xs text-gray-500">{Math.round(timeSinceOrder)} mins ago</p>
        </div>
      </div>
      <hr className="my-3 border-gray-600" />
      <div>
        <ul className="text-sm text-gray-300 list-disc list-inside mb-2">
          {order.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {order.specialInstructions && order.specialInstructions !== "None" && (
            <p className="text-xs bg-yellow-900/50 text-yellow-200 p-2 rounded border border-yellow-700/30">
                <span className="font-bold">Note:</span> {order.specialInstructions}
            </p>
        )}
      </div>
      {action && (
        <div className="mt-4">
          <button
            onClick={action.action}
            disabled={isUpdating}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-md font-semibold text-white transition-colors disabled:opacity-50 ${action.className}`}
          >
            {isUpdating ? <LoadingSpinner className="w-5 h-5 mr-2" /> : action.icon}
            {isUpdating ? 'Updating...' : action.label}
          </button>
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeOrders, setActiveOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = api.listenToActiveOrders((orders) => {
      setActiveOrders(orders);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center text-gray-400">
        <LoadingSpinner className="w-8 h-8 mb-3" />
        <p>Loading Active Orders...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-center">{error}</p>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">Live Orders Dashboard</h2>
      {activeOrders.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No active orders right now. New orders will appear here in real-time.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
