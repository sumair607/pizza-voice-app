
import React from 'react';
import { OrderDetails, OrderStatus } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface OrderReceiptProps {
  orderDetails: OrderDetails;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ orderDetails }) => {
  const isCanceled = orderDetails.status === OrderStatus.CANCELED;

  return (
    <div className={`bg-gray-800 rounded-lg p-6 shadow-lg border ${isCanceled ? 'border-red-500/50' : 'border-indigo-500/50'} mt-6 animate-fade-in-up relative`}>
      {isCanceled && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg z-10"></div>
      )}
       <div className="flex items-center mb-4 relative z-20">
        {isCanceled ? (
            <>
                <XCircleIcon className="w-8 h-8 text-red-400 mr-3" />
                <h2 className="text-2xl font-bold text-red-400">Order Canceled</h2>
            </>
        ) : (
            <>
                <CheckCircleIcon className="w-8 h-8 text-green-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">Order Confirmed!</h2>
            </>
        )}
      </div>

      <div className={`space-y-3 text-gray-300 ${isCanceled ? 'opacity-50' : ''}`}>
        <div className="flex justify-between">
          <span className="font-semibold">Order Time:</span>
          <span>{orderDetails.orderTimestamp.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Expected Delivery:</span>
          {orderDetails.expectedDeliveryTime ? (
             <span className="font-bold text-green-400">
                {orderDetails.expectedDeliveryTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
             </span>
          ) : (
            <span className="font-bold text-yellow-400">Not Available</span>
          )}
        </div>
         <div className="flex justify-between">
          <span className="font-semibold">Assigned Rider:</span>
          <span>{orderDetails.assignedRider.name}</span>
        </div>
      </div>
      <hr className={`my-4 ${isCanceled ? 'border-gray-700/50' : 'border-gray-700'}`} />
      <div className={`space-y-3 text-gray-300 ${isCanceled ? 'opacity-50' : ''}`}>
        <div className="flex justify-between">
          <span className="font-semibold">Customer:</span>
          <span>{orderDetails.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Address:</span>
          <span>{orderDetails.address}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">WhatsApp:</span>
          <span>{orderDetails.whatsappNumber}</span>
        </div>
      </div>
      <hr className={`my-4 ${isCanceled ? 'border-gray-700/50' : 'border-gray-700'}`} />
      <div className={`${isCanceled ? 'opacity-50' : ''}`}>
        <h3 className="text-lg font-semibold mb-2 text-white">Items:</h3>
        <ul className="space-y-1 list-disc list-inside text-gray-300">
          {orderDetails.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        {orderDetails.specialInstructions && orderDetails.specialInstructions !== "None" && (
            <div className="mt-3 bg-yellow-900/20 border border-yellow-700/50 p-2 rounded text-sm">
                <span className="font-bold text-yellow-500">Special Instructions: </span>
                <span className="text-yellow-200">{orderDetails.specialInstructions}</span>
            </div>
        )}
      </div>
      <hr className={`my-4 ${isCanceled ? 'border-gray-700/50' : 'border-gray-700'}`} />
      <div className={`flex justify-between items-center ${isCanceled ? 'opacity-50' : ''}`}>
        <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-400">Payment Method</span>
            <span className="text-lg font-bold text-white">{orderDetails.paymentMethod}</span>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-400">Total</span>
            <span className="text-2xl font-bold text-white">Rs.{orderDetails.total.toFixed(2)}</span>
        </div>
      </div>
      <hr className={`my-4 ${isCanceled ? 'border-gray-700/50' : 'border-gray-700'}`} />
       <div className={`${isCanceled ? 'opacity-50' : ''}`}>
        <h3 className="text-lg font-semibold mb-2 text-white">System Notifications:</h3>
        <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center"><CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" /> Sent to Chef's Kitchen Display</li>
            <li className="flex items-center"><CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" /> Sent to Rider: {orderDetails.assignedRider.name} ({orderDetails.assignedRider.number})</li>
            <li className="flex items-center"><CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" /> Sent to Customer WhatsApp: {orderDetails.whatsappNumber}</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderReceipt;
