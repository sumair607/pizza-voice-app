
import React from 'react';
import { ShopInfo } from '../types';
import { XMarkIcon, ClockIcon, InfoIcon } from './icons';

interface ShopInfoModalProps {
    info: ShopInfo;
    onClose: () => void;
}

const ShopInfoModal: React.FC<ShopInfoModalProps> = ({ info, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-indigo-500/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{info.name}</h2>
                        <p className="text-indigo-200 text-sm flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1"/> 
                            Hours: {info.workingHours?.start} - {info.workingHours?.end}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* About Section */}
                    {info.about && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center">
                                <InfoIcon className="w-4 h-4 mr-2"/> About Us
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                {info.about}
                            </p>
                        </div>
                    )}

                    {/* FAQ Section */}
                    {info.faqs && info.faqs.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Frequently Asked Questions</h3>
                            <div className="space-y-3">
                                {info.faqs.map((faq, idx) => (
                                    <div key={idx} className="bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                                        <p className="text-white font-semibold text-sm mb-1">{faq.question}</p>
                                        <p className="text-gray-400 text-xs">{faq.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                     {/* Disclaimer Section */}
                     {info.disclaimer && (
                        <div className="pt-4 border-t border-gray-700">
                             <p className="text-xs text-gray-500 text-center italic">
                                "{info.disclaimer}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopInfoModal;
