import React from 'react';
import { OrderStatus } from '../types';
import { CheckCircleIcon, PizzaIcon, DeliveryIcon, XCircleIcon } from './icons';

interface OrderStatusTrackerProps {
  status: OrderStatus;
  expectedDeliveryTime: Date | null;
  canCancel: boolean;
  onCancelOrder: () => void;
  timeRemaining: number;
}

const statusSteps = [
  OrderStatus.PLACED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

const Step: React.FC<{
  label: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isActive: boolean;
}> = ({ label, icon, isCompleted, isActive }) => {
  const statusColor = isCompleted ? 'text-green-400' : isActive ? 'text-yellow-400 animate-pulse' : 'text-gray-500';
  const bgColor = isCompleted ? 'bg-green-500/20' : isActive ? 'bg-yellow-500/20' : 'bg-gray-700/50';

  return (
    <div className="flex flex-col items-center text-center w-24">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bgColor} ${statusColor} border-2 ${isCompleted ? 'border-green-500/50' : isActive ? 'border-yellow-500/50' : 'border-gray-600'}`}>
        {icon}
      </div>
      <p className={`mt-2 text-xs font-semibold ${isCompleted || isActive ? 'text-white' : 'text-gray-400'}`}>{label}</p>
    </div>
  );
};

const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ status, expectedDeliveryTime, canCancel, onCancelOrder, timeRemaining }) => {
  const activeIndex = statusSteps.indexOf(status);
  
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getIcon = (step: OrderStatus) => {
    switch (step) {
      case OrderStatus.PLACED:
        return <CheckCircleIcon className="w-6 h-6" />;
      case OrderStatus.PREPARING:
        return <PizzaIcon className="w-6 h-6" />;
      case OrderStatus.OUT_FOR_DELIVERY:
        return <DeliveryIcon className="w-6 h-6" />;
      case OrderStatus.DELIVERED:
        return <CheckCircleIcon className="w-6 h-6" />;
      default:
        return null;
    }
  };

  if (status === OrderStatus.CANCELED) {
    return (
       <div className="bg-gray-800 rounded-lg p-6 my-6 animate-fade-in-up border border-red-500/50 flex flex-col items-center justify-center">
            <XCircleIcon className="w-12 h-12 text-red-400 mb-2"/>
            <h3 className="text-xl font-bold text-red-400">Order Canceled</h3>
       </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 my-6 animate-fade-in-up border border-indigo-500/50">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white">Order Progress</h3>
        {expectedDeliveryTime && status !== OrderStatus.DELIVERED && (
          <p className="text-sm text-yellow-300 font-semibold">
            Estimated Delivery: {expectedDeliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
         {status === OrderStatus.DELIVERED && (
          <p className="text-sm text-green-400 font-semibold">
            Delivered! Enjoy your meal.
          </p>
        )}
      </div>
      <div className="flex items-start justify-between">
        {statusSteps.map((step, index) => (
          <React.Fragment key={step}>
            <Step
              label={step}
              icon={getIcon(step)}
              isCompleted={index < activeIndex}
              isActive={index === activeIndex}
            />
            {index < statusSteps.length - 1 && (
              <div className={`flex-1 h-1 mt-6 mx-2 rounded ${index < activeIndex ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
       {status === OrderStatus.PLACED && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <button
                onClick={onCancelOrder}
                disabled={!canCancel}
                className={`w-full px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400
                    ${canCancel ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                `}
            >
                {canCancel ? `Cancel Order (${formatTime(timeRemaining)})` : 'Cancellation Window Closed'}
            </button>
        </div>
      )}
    </div>
  );
};

export default OrderStatusTracker;