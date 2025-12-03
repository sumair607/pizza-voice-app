
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { SessionStatus, Message, OrderDetails, Rider, OrderStatus, ShopInfo, MenuItem, Deal, SettingsPayload } from './types';
import { MicrophoneIcon, SpeakerIcon, LoadingSpinner, CogIcon, HistoryIcon, XCircleIcon, AdminIcon, InfoIcon, ClockIcon } from './components/icons';
import OrderReceipt from './components/OrderReceipt';
import SettingsManager from './components/SettingsManager';
import OrderStatusTracker from './components/OrderStatusTracker';
import OrderHistory from './components/OrderHistory';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ShopInfoModal from './components/ShopInfoModal';
import * as api from './api';

const CANCELLATION_WINDOW_MS = 5 * 60 * 1000;

const isUrdu = (text: string): boolean => {
  if (!text) return false;
  const urduRegex = /[\u0600-\u06FF]/;
  return urduRegex.test(text);
};

const App: React.FC = () => {
  const [view, setView] = useState<'customer' | 'admin' | 'login'>('customer');
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserTranscription, setCurrentUserTranscription] = useState<string>('');
  const [currentModelTranscription, setCurrentModelTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderDetails | null>(null);

  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderDetails[]>([]);
  const [showSettingsManager, setShowSettingsManager] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showShopInfoModal, setShowShopInfoModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [loadedSettings, history] = await Promise.all([
          api.getSettings(),
          api.getOrderHistory(),
        ]);
        setSettings(loadedSettings);
        setOrderHistory(history);
        
        // Load persisted order if exists
        const savedOrder = localStorage.getItem('currentOrder');
        if (savedOrder) {
          try {
            const orderData = JSON.parse(savedOrder);
            const restoredOrder = {
              ...orderData,
              orderTimestamp: new Date(orderData.orderTimestamp),
              expectedDeliveryTime: orderData.expectedDeliveryTime ? new Date(orderData.expectedDeliveryTime) : null
            };
            // Only restore if order is still active (not delivered/canceled)
            if (restoredOrder.status === 'PLACED' || restoredOrder.status === 'PREPARING' || restoredOrder.status === 'OUT_FOR_DELIVERY') {
              setCurrentOrder(restoredOrder);
            } else {
              localStorage.removeItem('currentOrder');
            }
          } catch (e) {
            localStorage.removeItem('currentOrder');
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
        setError("Could not load app settings.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
    
    // Check Local Ban
    const bannedUntil = localStorage.getItem('bannedUntil');
    if (bannedUntil && parseInt(bannedUntil) > Date.now()) {
        setIsBanned(true);
    }
  }, []);

  useEffect(() => {
    if (currentOrder?.id) {
        const unsubscribe = api.listenToOrderUpdates(currentOrder.id, (updatedOrder) => {
            setCurrentOrder(updatedOrder);
            // Update localStorage with latest order status
            localStorage.setItem('currentOrder', JSON.stringify({
              ...updatedOrder,
              orderTimestamp: updatedOrder.orderTimestamp.toISOString(),
              expectedDeliveryTime: updatedOrder.expectedDeliveryTime?.toISOString()
            }));
            
            if (updatedOrder.status === OrderStatus.DELIVERED || updatedOrder.status === OrderStatus.CANCELED) {
                // Clear localStorage when order is complete
                localStorage.removeItem('currentOrder');
                setTimeout(async () => {
                    const history = await api.getOrderHistory();
                    setOrderHistory(history);
                }, 1000);
            }
        });
        return () => unsubscribe();
    }
  }, [currentOrder?.id]); 

  const handleSaveSettings = async (updatedSettings: SettingsPayload) => {
    try {
        await api.saveSettings(updatedSettings);
        setSettings(updatedSettings);
    } catch(err) {
        console.error("Failed to save settings", err);
        setError("Could not save settings.");
    }
  };
  
  useEffect(() => {
    if (currentOrder && currentOrder.status === OrderStatus.PLACED) {
      if (timeUpdateIntervalRef.current === null) {
        timeUpdateIntervalRef.current = window.setInterval(() => setCurrentTime(new Date()), 1000);
      }
    } else {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    }
    return () => {
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    };
  }, [currentOrder]);

  const onTranscriptionUpdate = useCallback((isUserInput: boolean, text: string) => {
    if (isUserInput) setCurrentUserTranscription(text);
    else setCurrentModelTranscription(text);
  }, []);
  
  const onTranscriptionComplete = useCallback((isUserInput: boolean, text: string) => {
    setMessages(prev => [...prev, { speaker: isUserInput ? 'user' : 'model', text }]);
    if (isUserInput) setCurrentUserTranscription('');
    else setCurrentModelTranscription('');
  }, []);

  const onOrderPlaced = useCallback((newOrder: OrderDetails) => {
    setCurrentOrder(newOrder);
    setCurrentTime(new Date());
    // Store order in localStorage for persistence
    localStorage.setItem('currentOrder', JSON.stringify({
      ...newOrder,
      orderTimestamp: newOrder.orderTimestamp.toISOString(),
      expectedDeliveryTime: newOrder.expectedDeliveryTime?.toISOString()
    }));
  }, []);

  const { startSession, stopSession } = useLiveSession({
    shopInfo: settings?.shopInfo ?? { name: 'Loading...', salesDeskWhatsapp: '', adminKey: '', workingHours: { start: '11:00', end: '23:00' }, about: '', disclaimer: '', faqs: [] },
    pizzas: settings?.pizzas ?? [],
    drinks: settings?.drinks ?? [],
    deals: settings?.deals ?? [],
    riders: settings?.riders ?? [],
    allowedZones: settings?.allowedZones ?? [],
    onStatusChange: setStatus,
    onTranscriptionUpdate,
    onTranscriptionComplete,
    onOrderPlaced,
    onError: (e) => {
        setError(e);
        setStatus(SessionStatus.ERROR);
    },
  });

  const handleStart = async () => {
    if (isBanned) return;
    setError(null);
    setMessages([]);
    setCurrentOrder(null);
    setShowSettingsManager(false);
    await startSession();
  };

  const handleCancelOrder = async () => {
    if (currentOrder) {
      try {
        await api.updateOrderStatusInHistory(currentOrder.id, OrderStatus.CANCELED);
      } catch (err) {
        console.error("Failed to cancel", err);
        setError("Could not cancel order.");
      }
    }
  };
  
  const handleAdminClick = () => {
    if (view === 'admin') setView('customer');
    else setView('login');
  };

  const timeSinceOrder = currentOrder ? currentTime.getTime() - currentOrder.orderTimestamp.getTime() : 0;
  const canCancel = currentOrder?.status === OrderStatus.PLACED && timeSinceOrder < CANCELLATION_WINDOW_MS;
  const timeRemainingForCancellation = CANCELLATION_WINDOW_MS - timeSinceOrder;

  const renderTranscription = (message: Message, index: number) => {
    const isUrduMsg = isUrdu(message.text);
    return (
      <div key={index} className={`flex items-start gap-3 my-2 animate-fade-in ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`p-1 rounded-full ${message.speaker === 'user' ? 'bg-blue-500' : 'bg-indigo-500'}`}>
          {message.speaker === 'user' ? <MicrophoneIcon className="w-4 h-4 text-white" /> : <SpeakerIcon className="w-4 h-4 text-white" />}
        </div>
        <div className={`px-4 py-2 rounded-lg max-w-sm md:max-w-md shadow ${message.speaker === 'user' ? 'bg-blue-500/80' : 'bg-gray-700'}`} dir={isUrduMsg ? 'rtl' : 'ltr'} style={{ fontFamily: isUrduMsg ? "'Noto Nastaliq Urdu', serif" : 'inherit' }}>
          {message.text}
        </div>
      </div>
    );
  };
  
  const renderLiveTranscription = (text: string, isUser: boolean) => {
    if (!text) return null;
    const isUrduMsg = isUrdu(text);
    return (
      <div className={`flex items-start gap-3 my-2 text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`p-1 rounded-full ${isUser ? 'bg-blue-500/50' : 'bg-indigo-500/50'}`}>
          {isUser ? <MicrophoneIcon className="w-4 h-4 text-white" /> : <SpeakerIcon className="w-4 h-4 text-white" />}
        </div>
        <div className={`px-4 py-2 rounded-lg max-w-sm md:max-w-md ${isUser ? 'bg-blue-500/20' : 'bg-gray-700/50'}`} dir={isUrduMsg ? 'rtl' : 'ltr'} style={{ fontFamily: isUrduMsg ? "'Noto Nastaliq Urdu', serif" : 'inherit' }}>
          {text}
        </div>
      </div>
    );
  };
  
  const renderActionButton = () => {
    const isSessionActive = status === SessionStatus.CONNECTING || status === SessionStatus.CONNECTED;
    const isDisabled = isLoading || !settings || (settings.riders.length === 0 && !isSessionActive) || isBanned;
    
    let buttonText = 'Start Ordering';
    let btnColor = 'bg-green-600 hover:bg-green-700';
    
    if (isBanned) {
        buttonText = 'Access Denied (Banned)';
        btnColor = 'bg-gray-600 cursor-not-allowed';
    } else if (status === SessionStatus.CONNECTING) {
        buttonText = 'Connecting...';
        btnColor = 'bg-green-600';
    } else if (status === SessionStatus.CONNECTED) {
        buttonText = 'Stop Session';
        btnColor = 'bg-red-600 hover:bg-red-700';
    }

    return (
      <button
        onClick={isSessionActive ? stopSession : handleStart}
        disabled={isDisabled}
        className={`w-full max-w-sm px-6 py-4 rounded-lg font-bold text-xl transition-all duration-300 ease-in-out shadow-lg ${btnColor} ${isDisabled ? 'opacity-50' : 'hover:-translate-y-1'}`}
      >
        <div className="flex items-center justify-center">
            {status === SessionStatus.CONNECTING && <LoadingSpinner className="w-6 h-6 mr-3" />}
            <span>{buttonText}</span>
        </div>
      </button>
    );
  };

  return (
    // Beautiful Border Implementation: A gradient wrapper
    <div className="min-h-screen bg-gray-900 p-1 sm:p-2 md:p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-6xl min-h-[95vh] bg-gray-900 rounded-2xl relative p-1 shadow-2xl overflow-hidden">
        {/* Animated Gradient Border */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-pulse opacity-50 rounded-2xl pointer-events-none"></div>
        
        {/* Main Content Container */}
        <div className="absolute inset-[2px] bg-gray-900 rounded-2xl flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <header className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-full"><SpeakerIcon className="w-6 h-6 text-white"/></div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            {settings?.shopInfo.name || "Loading..."}
                        </h1>
                        {settings?.shopInfo.workingHours && (
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                                <ClockIcon className="w-3 h-3 mr-1"/> {settings.shopInfo.workingHours.start} - {settings.shopInfo.workingHours.end}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {view === 'customer' && (
                        <button onClick={() => setShowShopInfoModal(true)} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700">
                            <InfoIcon className="w-5 h-5 text-indigo-300" />
                        </button>
                    )}
                    {view === 'admin' && (
                        <>
                            <button onClick={() => setShowHistoryModal(prev => !prev)} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"><HistoryIcon className="w-5 h-5 text-indigo-300" /></button>
                            <button onClick={() => setShowSettingsManager(prev => !prev)} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"><CogIcon className="w-5 h-5 text-indigo-300" /></button>
                        </>
                    )}
                    <button onClick={handleAdminClick} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700">
                        <AdminIcon className={`w-5 h-5 ${view === 'admin' ? 'text-yellow-300' : 'text-indigo-300'}`} />
                    </button>
                </div>
            </header>

            {/* Modals */}
            {showShopInfoModal && settings && <ShopInfoModal info={settings.shopInfo} onClose={() => setShowShopInfoModal(false)} />}
            {view === 'admin' && showSettingsManager && settings && <SettingsManager initialSettings={settings} onSave={handleSaveSettings} onClose={() => setShowSettingsManager(false)} />}
            {view === 'admin' && showHistoryModal && <OrderHistory orders={orderHistory} onClose={() => setShowHistoryModal(false)} />}

            {/* Main Body */}
            <main className="flex-1 flex flex-col items-center justify-center w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center text-gray-400">
                        <LoadingSpinner className="w-10 h-10 mb-4" />
                        <p className="text-lg">Loading Shop...</p>
                    </div>
                ) : error ? (
                    <div className="text-center bg-red-900/30 border border-red-700/50 p-6 rounded-xl max-w-xl backdrop-blur-sm">
                        <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-3"/>
                        <h2 className="text-xl font-bold text-red-300 mb-2">Notice</h2>
                        <p className="text-red-200 text-sm">{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-white font-semibold transition-colors">Refresh</button>
                    </div>
                ) : view === 'login' ? (
                    <AdminLogin correctKey={settings?.shopInfo.adminKey || '123456'} onSuccess={() => setView('admin')} onCancel={() => setView('customer')} />
                ) : view === 'admin' ? (
                    <AdminDashboard />
                ) : (
                    // Customer Interface
                    <div className="w-full max-w-3xl flex flex-col items-center">
                        {status === SessionStatus.IDLE && !currentOrder && (
                            <div className="text-center text-gray-400 mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2">Hungry? Just Ask!</h2>
                                <p>Tap the button below and speak to place your order.</p>
                                <p className="text-sm text-yellow-300 mt-2">📱 Mobile users: Allow microphone access when prompted</p>
                                {settings && settings.riders.length === 0 && <p className="text-yellow-400 font-semibold mt-2">Shop Warning: No riders configured.</p>}
                            </div>
                        )}
                        
                        {(status === SessionStatus.IDLE || status === SessionStatus.ERROR) && !currentOrder && renderActionButton()}

                        {(status === SessionStatus.CONNECTING || status === SessionStatus.CONNECTED) && (
                            <div className="w-full flex flex-col h-[60vh] bg-gray-800/40 rounded-xl p-4 shadow-inner border border-gray-700 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700/50">
                                    <div className="flex items-center text-indigo-300 animate-pulse">
                                        {status === SessionStatus.CONNECTING ? <LoadingSpinner className="w-4 h-4 mr-2" /> : <SpeakerIcon className="w-4 h-4 mr-2" />}
                                        <span className="text-sm font-semibold">{status === SessionStatus.CONNECTING ? 'Connecting...' : 'Listening...'}</span>
                                    </div>
                                    {renderActionButton()}
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                    {messages.map(renderTranscription)}
                                    {renderLiveTranscription(currentUserTranscription, true)}
                                    {renderLiveTranscription(currentModelTranscription, false)}
                                    <div ref={endOfMessagesRef} />
                                </div>
                            </div>
                        )}
                        
                        {currentOrder && (
                            <div className="w-full max-w-4xl mt-4 px-4">
                                <OrderStatusTracker status={currentOrder.status} expectedDeliveryTime={currentOrder.expectedDeliveryTime} canCancel={canCancel} onCancelOrder={handleCancelOrder} timeRemaining={timeRemainingForCancellation} />
                                <div className="block">
                                    <OrderReceipt orderDetails={currentOrder} />
                                </div>
                                {(currentOrder.status === OrderStatus.DELIVERED || currentOrder.status === OrderStatus.CANCELED) && (
                                    <div className="mt-6 text-center">{renderActionButton()}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
      </div>
    </div>
  );
};

export default App;
