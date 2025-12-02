
import { useCallback, useRef, useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SessionStatus, OrderDetails, Rider, ShopInfo, MenuItem, Deal, OrderStatus } from '../types';
import { decode, encode, decodeAudioData } from '../utils/audio';
import * as api from '../backend/api';

// Available voices in Gemini Live API
const VOICE_OPTIONS = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

// Check if current time is within working hours
const isShopOpen = (start: string, end: string): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        // Overnight shift (e.g. 11 PM to 2 AM)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const generateSystemInstruction = (shopInfo: ShopInfo, pizzas: MenuItem[], drinks: MenuItem[], deals: Deal[]): string => {
  const formatMenuItems = (items: MenuItem[]) => {
    if (items.length === 0) return 'کوئی دستیاب نہیں';
    return items.map(item =>
      `- ${item.name}: ${Object.entries(item.sizes).map(([size, price]) => `${size} (Rs.${price})`).join('، ')}`
    ).join('\n');
  };

  const formatDeals = (deals: Deal[]) => {
    if (deals.length === 0) return 'کوئی دستیاب نہیں';
    return deals.map(deal =>
      `- "${deal.name}": ${deal.description}، صرف Rs.${deal.price} میں۔`
    ).join('\n');
  };

  return `You are a friendly and fast AI voice assistant for a pizza shop named "${shopInfo.name}". Your job is to take pizza orders over the phone.

**CRITICAL LANGUAGE & BEHAVIOR RULES:**
1.  **ABSOLUTELY NO HINDI SCRIPT (DEVANAGARI).** USE ONLY URDU SCRIPT (Nastaliq/Arabic style) OR ENGLISH.
2.  **POLITENESS:** Always be polite.
3.  **VULGARITY:** If the user uses vulgar/abusive language, warn them sternly: "Please use respectful language or this call will be terminated." If they do it again, say "Goodbye" and output the exact token: ***TERMINATE_SESSION***.
4.  **IRRELEVANCE:** If the user asks irrelevant questions (not about pizza/ordering) for more than 5 sentences, warn them: "Please stick to pizza ordering." If they continue for 3 more sentences, say "I cannot assist with that. Goodbye." and output the exact token: ***TERMINATE_SESSION***.

**Your Knowledge Base:**
**Pizzas:**
${formatMenuItems(pizzas)}
**Drinks:**
${formatMenuItems(drinks)}
**Deals:**
${formatDeals(deals)}

**Interaction Flow:**
1.  Greet warmly as "${shopInfo.name}" assistant.
2.  Answer menu questions using strictly the provided list.
3.  **ALWAYS ask for Special Instructions** before finalizing.
4.  Confirm the full order, total price, and special instructions.
5.  Ask for Payment Method, Name, Address, and WhatsApp number.
6.  Call \`placeOrder\` to finalize.
7.  Use \`checkOrderStatus\` if they ask status.

**Function Calling Rule:**
- Speak to the user in **Urdu or English**.
- Pass data to functions in **ENGLISH ONLY**.
`;
};


const placeOrderFunctionDeclaration: FunctionDeclaration = {
  name: 'placeOrder',
  description: 'Finalizes the pizza order and sends a receipt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: 'The name of the customer.' },
      address: { type: Type.STRING, description: 'The delivery address.' },
      whatsappNumber: { type: Type.STRING, description: 'The customer\'s WhatsApp number for the receipt.' },
      items: {
        type: Type.ARRAY,
        description: 'A list of items in the order.',
        items: { type: Type.STRING },
      },
      specialInstructions: { type: Type.STRING, description: 'Any special requests. Defaults to "None".' },
      total: { type: Type.NUMBER, description: 'The total cost of the order in Rs.' },
      paymentMethod: { type: Type.STRING, description: 'The chosen payment method.' },
    },
    required: ['customerName', 'address', 'whatsappNumber', 'items', 'total', 'paymentMethod'],
  },
};

const checkOrderStatusFunctionDeclaration: FunctionDeclaration = {
    name: 'checkOrderStatus',
    description: 'Checks the status of the most recently placed order.',
    parameters: { type: Type.OBJECT, properties: {} },
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

// --- Simulated Backend Rules (Simulated) ---
const BASE_PREP_TIME_MS = 10 * 60 * 1000;
const PER_ITEM_PREP_TIME_MS = 3 * 60 * 1000;
const BASE_TRAVEL_TIME_MS = 15 * 60 * 1000;
const MAX_RANDOM_TRAVEL_MS = 10 * 60 * 1000;
const RIDER_COOLDOWN_BASE_MS = 2 * 60 * 1000;
const RIDER_COOLDOWN_RANDOM_MS = 5 * 60 * 1000;

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
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  const orderJustPlacedRef = useRef(false);
  const currentSessionOrderIdRef = useRef<string | null>(null);
  const riderStatusRef = useRef<Record<string, { availableTime: number }>>({});

  const stopSession = useCallback(async () => {
    onStatusChange(SessionStatus.IDLE);

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error('Error closing session:', e);
      }
      sessionPromiseRef.current = null;
    }

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
    const currentTime = now.getTime();
    const numberOfItems = args.items?.length || 1;
    
    const dynamicPrepTime = BASE_PREP_TIME_MS + (numberOfItems * PER_ITEM_PREP_TIME_MS);
    
    if (riders.length === 0) {
        console.error("No riders available.");
        return;
    }

    let bestRider: Rider = riders[0];
    let soonestAvailableTime = riderStatusRef.current[bestRider.name]?.availableTime || currentTime;

    for (let i = 1; i < riders.length; i++) {
        const rider = riders[i];
        const riderAvailableTime = riderStatusRef.current[rider.name]?.availableTime || currentTime;
        if (riderAvailableTime < soonestAvailableTime) {
            soonestAvailableTime = riderAvailableTime;
            bestRider = rider;
        }
    }
    
    const effectiveRiderAvailableTime = Math.max(soonestAvailableTime, currentTime);
    const deliveryStartTime = Math.max(currentTime + dynamicPrepTime, effectiveRiderAvailableTime);
    const dynamicTravelTime = BASE_TRAVEL_TIME_MS + (Math.random() * MAX_RANDOM_TRAVEL_MS);
    const estimatedDeliveryTimestamp = deliveryStartTime + dynamicTravelTime;
    
    const cooldownPeriod = RIDER_COOLDOWN_BASE_MS + (Math.random() * RIDER_COOLDOWN_RANDOM_MS);
    riderStatusRef.current[bestRider.name] = { availableTime: estimatedDeliveryTimestamp + cooldownPeriod };
    
    const orderData: Omit<OrderDetails, 'id'> = {
      ...(args as Omit<OrderDetails, 'id' | 'orderTimestamp' | 'expectedDeliveryTime' | 'assignedRider' | 'status'>),
      specialInstructions: args.specialInstructions || "None",
      orderTimestamp: now,
      expectedDeliveryTime: new Date(estimatedDeliveryTimestamp),
      assignedRider: bestRider,
      status: OrderStatus.PLACED
    };

    try {
      const orderId = await api.saveOrderToHistory(orderData);
      currentSessionOrderIdRef.current = orderId; 
      const finalOrder: OrderDetails = { ...orderData, id: orderId };
      onOrderPlaced(finalOrder);
      orderJustPlacedRef.current = true; 
    } catch (err) {
      console.error("Failed to save order", err);
      onError("Problem confirming order.");
    }
  };

  const handleCheckOrderStatus = async () => {
    if (!currentSessionOrderIdRef.current) {
        return "No active order found.";
    }
    return "Order is in system. Check screen for status.";
  };

  const startSession = useCallback(async () => {
    // 1. Check Working Hours
    if (shopInfo.workingHours && !isShopOpen(shopInfo.workingHours.start, shopInfo.workingHours.end)) {
        onError(`Shop is currently closed. Hours: ${shopInfo.workingHours.start} to ${shopInfo.workingHours.end}`);
        return;
    }

    orderJustPlacedRef.current = false;
    currentSessionOrderIdRef.current = null;
    onStatusChange(SessionStatus.CONNECTING);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      let baseInstruction = generateSystemInstruction(shopInfo, pizzas, drinks, deals);
      if (allowedZones.length > 0) {
        baseInstruction += `\n\n**Delivery Zones:** Accept orders only for: **${allowedZones.join('، ')}**.`;
      }

      const randomVoice = VOICE_OPTIONS[Math.floor(Math.random() * VOICE_OPTIONS.length)];
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;

      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();
      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: randomVoice } } },
          systemInstruction: baseInstruction,
          tools: [{ functionDeclarations: [placeOrderFunctionDeclaration, checkOrderStatusFunctionDeclaration] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            onStatusChange(SessionStatus.CONNECTED);
            const source = inputAudioContext.createMediaStreamSource(mediaStreamRef.current!);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const buffer = new ArrayBuffer(inputData.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                view.setInt16(i * 2, s * 0x7FFF, true);
              }
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: { data: encode(new Uint8Array(buffer)), mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.serverContent?.inputTranscription) {
              currentInputTranscription += message.serverContent.inputTranscription.text;
              onTranscriptionUpdate(true, currentInputTranscription);
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
              onTranscriptionUpdate(false, currentOutputTranscription);
            }
            
            if (message.serverContent?.turnComplete) {
              // ** SECURITY CHECK: Did the AI decide to terminate? **
              if (currentOutputTranscription.includes('***TERMINATE_SESSION***')) {
                  stopSession();
                  onError("Session terminated due to policy violation (Vulgarity or Irrelevance).");
                  // SHADOW BAN USER FOR 24 HOURS
                  localStorage.setItem('bannedUntil', (Date.now() + 24 * 60 * 60 * 1000).toString());
                  return;
              }

              const isModelTurn = currentOutputTranscription.trim().length > 0;
              if(currentInputTranscription.trim()) onTranscriptionComplete(true, currentInputTranscription);
              if(isModelTurn) onTranscriptionComplete(false, currentOutputTranscription);
              
              if (isModelTurn && orderJustPlacedRef.current) {
                stopSession();
                orderJustPlacedRef.current = false;
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
            
            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'placeOrder') {
                  await handlePlaceOrder(fc.args);
                  const session = await sessionPromiseRef.current;
                  session?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK, order placed." } } });
                } else if (fc.name === 'checkOrderStatus') {
                    const statusMsg = await handleCheckOrderStatus();
                    const session = await sessionPromiseRef.current;
                    session?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: statusMsg } } });
                }
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            onError('Connection error.');
            stopSession();
          },
          onclose: () => stopSession(),
        },
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
