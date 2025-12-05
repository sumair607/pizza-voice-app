
import { useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { SessionStatus, OrderDetails, Rider, ShopInfo, MenuItem, Deal, OrderStatus } from '../types';
import { decode, encode, decodeAudioData } from '../utils/audio';
import * as api from '../backend/api';

// Available voices in Gemini Live API
const VOICE_OPTIONS = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

const isShopOpen = (start: string, end: string): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const generateSystemInstruction = (shopInfo: ShopInfo, pizzas: MenuItem[], drinks: MenuItem[], deals: Deal[]): string => {
  const formatMenuItems = (items: MenuItem[]) => {
    if (items.length === 0) return 'None available';
    return items.map(item =>
      `- ${item.name}: ${Object.entries(item.sizes).map(([size, price]) => `${size} (Rs.${price})`).join(', ')}`
    ).join('\n');
  };

  const formatDeals = (deals: Deal[]) => {
    if (deals.length === 0) return 'None available';
    return deals.map(deal =>
      `- "${deal.name}": ${deal.description}, only Rs.${deal.price}.`
    ).join('\n');
  };

  return `You are a friendly and fast AI voice assistant for a pizza shop named "${shopInfo.name}". Your job is to take pizza orders over the phone.

**CRITICAL RULES:**
1.  **NO HINDI SCRIPT.** Use Urdu (Nastaliq) or English only.
2.  **POLITENESS:** Be polite.
3.  **VULGARITY:** Warn strictly if vulgar. If repeated, say Goodbye and output: ***TERMINATE_SESSION***.
4.  **IRRELEVANCE:** Warn if off-topic. If repeated, output: ***TERMINATE_SESSION***.

**Menu:**
Pizzas:
${formatMenuItems(pizzas)}
Drinks:
${formatMenuItems(drinks)}
Deals:
${formatDeals(deals)}

**Flow:**
1. Greet as "${shopInfo.name}".
2. Answer menu questions.
3. **Ask for Special Instructions**.
4. Confirm order & total.
5. Ask Payment Method, Name, Address, WhatsApp.
6. Call 'placeOrder'.
`;
};

const placeOrderTool = {
  name: 'placeOrder',
  description: 'Finalizes the pizza order.',
  parameters: {
    type: 'OBJECT',
    properties: {
      customerName: { type: 'STRING' },
      address: { type: 'STRING' },
      whatsappNumber: { type: 'STRING' },
      items: { type: 'ARRAY', items: { type: 'STRING' } },
      specialInstructions: { type: 'STRING' },
      total: { type: 'NUMBER' },
      paymentMethod: { type: 'STRING' },
    },
    required: ['customerName', 'address', 'whatsappNumber', 'items', 'total', 'paymentMethod'],
  },
};

const checkOrderStatusTool = {
    name: 'checkOrderStatus',
    description: 'Checks status of recent order.',
    parameters: { type: 'OBJECT', properties: {} },
};

interface UseLiveSessionProps {
  shopInfo: ShopInfo;
  pizzas: MenuItem[];
  drinks: MenuItem[];
  deals: Deal[];
  riders: Rider[];
  allowedZones: string[];
  onStatusChange: (status: SessionStatus) => void;
  onTranscriptionUpdate: (isUserInput: boolean, text: string) => void;
  onTranscriptionComplete: (isUserInput: boolean, text: string) => void;
  onOrderPlaced: (details: OrderDetails) => void;
  onError: (error: string) => void;
}

export const useLiveSession = ({
  shopInfo,
  pizzas,
  drinks,
  deals,
  riders,
  allowedZones,
  onStatusChange,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onOrderPlaced,
  onError,
}: UseLiveSessionProps) => {
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeSessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  const orderJustPlacedRef = useRef(false);
  const currentSessionOrderIdRef = useRef<string | null>(null);

  const stopSession = useCallback(async () => {
    onStatusChange(SessionStatus.IDLE);
    
    if (activeSessionRef.current) {
        try { activeSessionRef.current.close(); } catch(e) {}
        activeSessionRef.current = null;
    }
    sessionPromiseRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
     if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
  }, [onStatusChange]);
  
  const handlePlaceOrder = async (args: any) => {
    const now = new Date();
    const orderData: Omit<OrderDetails, 'id'> = {
      ...(args as any),
      specialInstructions: args.specialInstructions || "None",
      orderTimestamp: now,
      expectedDeliveryTime: new Date(now.getTime() + 45 * 60000),
      assignedRider: riders.length > 0 ? riders[0] : { name: "Shop Rider", number: "N/A" },
      status: OrderStatus.PLACED
    };

    try {
      const orderId = await api.saveOrderToHistory(orderData);
      currentSessionOrderIdRef.current = orderId; 
      onOrderPlaced({ ...orderData, id: orderId });
      orderJustPlacedRef.current = true; 
    } catch (err) {
      console.error("Failed to save order", err);
      onError("Problem confirming order.");
    }
  };

  const handleCheckOrderStatus = async () => {
    if (!currentSessionOrderIdRef.current) return "No active order found.";
    return "Order is in system. Check screen for status.";
  };

  const startSession = useCallback(async () => {
    // Prefer client-side VITE_GEMINI_API_KEY only for full live Gemini sessions.
    // If not present, check for a server-side key (GEMINI_API_KEY) via the proxy endpoint.
    const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
    if (!clientApiKey || clientApiKey === 'PLACEHOLDER_API_KEY' || clientApiKey === 'PLACEHOLDER_GEMINI_API_KEY') {
      try {
        const resp = await fetch('/api/gemini-status');
        const json = await resp.json();
        if (!json.present) {
          onError("Valid Gemini API Key is missing. Set a client VITE_GEMINI_API_KEY (temporary) or configure server-side GEMINI_API_KEY and use the proxy.");
          return;
        }
        // If server-side key present, warn user that live sessions still require a client token for the live SDK,
        // but non-live calls can use the server proxy. Proceeding may fail depending on model usage.
        onError('Server-side Gemini key is present. Non-live requests will use server proxy; live sessions may still require a client-side key.');
      } catch (e) {
        onError("Valid Gemini API Key is missing and proxy check failed. Please configure GEMINI_API_KEY on the server or set VITE_GEMINI_API_KEY locally.");
        return;
      }
    }

    if (shopInfo.workingHours && !isShopOpen(shopInfo.workingHours.start, shopInfo.workingHours.end)) {
        onError(`Shop is closed. Hours: ${shopInfo.workingHours.start}-${shopInfo.workingHours.end}`);
        return;
    }

    // Check if browser supports required features
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError("Your browser doesn't support microphone access. Try Chrome or Safari.");
        return;
    }

    orderJustPlacedRef.current = false;
    currentSessionOrderIdRef.current = null;
    onStatusChange(SessionStatus.CONNECTING);
    
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Request microphone with better error handling
      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (micError) {
        onError("Microphone access denied. Please allow microphone and refresh.");
        return;
      }

      let baseInstruction = generateSystemInstruction(shopInfo, pizzas, drinks, deals);
      if (allowedZones.length > 0) baseInstruction += `\n\n**Delivery Zones:** ${allowedZones.join(', ')}.`;

      const randomVoice = VOICE_OPTIONS[Math.floor(Math.random() * VOICE_OPTIONS.length)];
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;

      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();
      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!activeSessionRef.current) {
          onError('Connection timeout. Please check your internet and try again.');
          onStatusChange(SessionStatus.ERROR);
          stopSession();
        }
      }, 10000); // 10 second timeout

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: randomVoice } } },
          systemInstruction: baseInstruction,
          tools: [{ functionDeclarations: [placeOrderTool, checkOrderStatusTool] as any }],
        },
        callbacks: {
            onopen: () => {
                console.log('✅ Gemini Live session connected');
                clearTimeout(connectionTimeout);
                onStatusChange(SessionStatus.CONNECTED);
                sessionPromiseRef.current?.then(sess => { activeSessionRef.current = sess; });

                const source = inputAudioContext.createMediaStreamSource(mediaStreamRef.current!);
                mediaStreamSourceRef.current = source;
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    // Check if session is still active and connected
                    if (!activeSessionRef.current) return;
                    
                    try {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const buffer = new ArrayBuffer(inputData.length * 2);
                        const view = new DataView(buffer);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            view.setInt16(i * 2, s * 0x7FFF, true);
                        }
                        activeSessionRef.current.sendRealtimeInput({ media: { data: encode(new Uint8Array(buffer)), mimeType: 'audio/pcm;rate=16000' } });
                    } catch (error: any) {
                        console.warn('Audio processing failed:', error?.message || 'Unknown error');
                        // Stop processing if connection is broken
                        if (error?.message?.includes('CLOSING') || error?.message?.includes('CLOSED')) {
                            stopSession();
                        }
                    }
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: any) => {
                 if (message.serverContent?.inputTranscription) {
                    currentInputTranscription += message.serverContent.inputTranscription.text;
                    onTranscriptionUpdate(true, currentInputTranscription);
                }
                if (message.serverContent?.outputTranscription) {
                    currentOutputTranscription += message.serverContent.outputTranscription.text;
                    onTranscriptionUpdate(false, currentOutputTranscription);
                }
                
                if (message.serverContent?.turnComplete) {
                    if (currentOutputTranscription.includes('***TERMINATE_SESSION***')) {
                        stopSession();
                        onError("Session terminated due to policy violation.");
                        localStorage.setItem('bannedUntil', (Date.now() + 24 * 60 * 60 * 1000).toString());
                        return;
                    }
                    const isModelTurn = currentOutputTranscription.trim().length > 0;
                    if(currentInputTranscription.trim()) onTranscriptionComplete(true, currentInputTranscription);
                    if(isModelTurn) onTranscriptionComplete(false, currentOutputTranscription);
                    
                    // Auto-end session after order is placed and goodbye is said
                    if (isModelTurn && orderJustPlacedRef.current && 
                        (currentOutputTranscription.toLowerCase().includes('goodbye') || 
                         currentOutputTranscription.toLowerCase().includes('thank you') ||
                         currentOutputTranscription.toLowerCase().includes('شکریہ') ||
                         currentOutputTranscription.includes('delivery'))) {
                        setTimeout(() => {
                            stopSession();
                        }, 2000); // Wait 2 seconds after goodbye
                    }
                    
                    currentInputTranscription = '';
                    currentOutputTranscription = '';
                }

                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const sourceNode = outputAudioContext.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.connect(outputAudioContext.destination);
                    sourceNode.addEventListener('ended', () => sources.delete(sourceNode));
                    sourceNode.start(nextStartTime);
                    nextStartTime += audioBuffer.duration;
                    sources.add(sourceNode);
                }

                if (message.serverContent?.interrupted) {
                    sources.forEach(s => s.stop());
                    sources.clear();
                    nextStartTime = 0;
                }
                
                if (message.toolCall?.functionCalls) {
                    if (sessionPromiseRef.current) {
                        sessionPromiseRef.current.then(async (session) => {
                            for (const fc of message.toolCall!.functionCalls!) {
                                if (fc.name === 'placeOrder') {
                                    await handlePlaceOrder(fc.args);
                                    session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "OK" } }] });
                                } else if (fc.name === 'checkOrderStatus') {
                                    const statusMsg = await handleCheckOrderStatus();
                                    session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: statusMsg } }] });
                                }
                            }
                        });
                    }
                }
            },
            onclose: (e: any) => {
                console.log("Session closed", e);
                activeSessionRef.current = null;
                if (onStatusChange) {
                    onStatusChange(SessionStatus.IDLE);
                }
            },
            onerror: (e: any) => {
                console.error('Session error:', e);
                activeSessionRef.current = null;
                let errorMsg = 'Connection failed';
                if (e.message?.includes('API key') || e.message?.includes('401')) {
                    errorMsg = 'Invalid API key';
                } else if (e.message?.includes('quota') || e.message?.includes('429')) {
                    errorMsg = 'API quota exceeded';
                } else if (e.message?.includes('network') || e.message?.includes('timeout')) {
                    errorMsg = 'Network connection failed';
                }
                onError(`${errorMsg}. Please try again.`);
                onStatusChange(SessionStatus.ERROR);
                stopSession();
            }
        }
      });

    } catch (err) {
      console.error('Failed start:', err);
      onError(`Failed to start: ${(err as Error).message}`);
      onStatusChange(SessionStatus.ERROR);
      await stopSession();
    }
  }, [onStatusChange, onTranscriptionUpdate, onTranscriptionComplete, onOrderPlaced, onError, stopSession, shopInfo, pizzas, drinks, deals, riders, allowedZones]);

  return { startSession, stopSession };
};
