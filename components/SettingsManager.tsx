
import React, { useState, useEffect } from 'react';
import { SettingsPayload, MenuItem, Deal, Rider } from '../types';
import { TrashIcon, CheckIcon, PlusIcon, XCircleIcon } from './icons';

interface SettingsManagerProps {
  initialSettings: SettingsPayload;
  onSave: (updatedSettings: SettingsPayload) => void;
  onClose: () => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ initialSettings, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState('shop');
  const [editedSettings, setEditedSettings] = useState<SettingsPayload>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Ensure new fields exist if loading old data
    const safeSettings = { ...initialSettings };
    if (!safeSettings.shopInfo.workingHours) safeSettings.shopInfo.workingHours = { start: '11:00', end: '23:00' };
    if (!safeSettings.shopInfo.faqs) safeSettings.shopInfo.faqs = [];
    if (!safeSettings.shopInfo.about) safeSettings.shopInfo.about = '';
    if (!safeSettings.shopInfo.disclaimer) safeSettings.shopInfo.disclaimer = '';
    setEditedSettings(safeSettings);
  }, [initialSettings]);

  const handleSave = async () => {
      setIsSaving(true);
      await onSave(editedSettings);
      setIsSaving(false);
      onClose();
  };

  const getShopLink = () => {
      const url = new URL(window.location.href);
      const shopId = url.searchParams.get('shop') || 'cheesy_occean';
      return `${url.origin}/?shop=${shopId}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'shop':
        return (
            <div className="text-center text-gray-300 w-full space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-600 text-left space-y-6">
                    <div className="bg-indigo-900/30 p-4 rounded border border-indigo-500/30">
                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1">Your Shop Customer Link</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-900 p-2 rounded text-sm text-gray-300 break-all">{getShopLink()}</code>
                            <button onClick={() => navigator.clipboard.writeText(getShopLink())} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded text-sm font-bold">Copy</button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-white">Shop Name</label>
                        <input 
                            type="text" 
                            value={editedSettings.shopInfo.name}
                            onChange={(e) => setEditedSettings({...editedSettings, shopInfo: {...editedSettings.shopInfo, name: e.target.value}})}
                            className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white outline-none"
                        />
                    </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-white">Sales WhatsApp</label>
                        <input 
                            type="text" 
                            value={editedSettings.shopInfo.salesDeskWhatsapp}
                            onChange={(e) => setEditedSettings({...editedSettings, shopInfo: {...editedSettings.shopInfo, salesDeskWhatsapp: e.target.value}})}
                            className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white outline-none"
                        />
                    </div>
                    <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                         <div><p className="text-sm font-bold text-white">Dashboard Key</p></div>
                         <div className="bg-gray-900 px-4 py-2 rounded border border-gray-700"><span className="text-xl font-mono text-green-400 font-bold">{editedSettings.shopInfo.adminKey}</span></div>
                    </div>
                </div>
            </div>
        );
      case 'info':
          return <InfoManager settings={editedSettings} setSettings={setEditedSettings} />;
      case 'menu':
          return <MenuManager settings={editedSettings} setSettings={setEditedSettings} />;
      case 'riders':
          return <RiderManager settings={editedSettings} setSettings={setEditedSettings} />;
      case 'zones':
        return <OperationsManager settings={editedSettings} setSettings={setEditedSettings} />;
      default:
        return <p>Select a tab</p>;
    }
  };

  const TabButton: React.FC<{tabName: string; label: string}> = ({ tabName, label }) => (
      <button onClick={() => setActiveTab(tabName)} className={`px-3 py-2 text-xs md:text-sm font-semibold rounded-t-lg ${activeTab === tabName ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'}`}>{label}</button>
  );

  return (
    <div className="bg-gray-800 rounded-lg mb-4 border border-indigo-500/30 w-full max-w-4xl mx-auto shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-700 pr-2 bg-gray-900/30 rounded-t-lg">
            <div className="flex mt-2 ml-2 overflow-x-auto no-scrollbar gap-1">
                <TabButton tabName="shop" label="Shop Info" />
                <TabButton tabName="info" label="Info & Hours" />
                <TabButton tabName="menu" label="Menu" />
                <TabButton tabName="riders" label="Riders" />
                <TabButton tabName="zones" label="Zones" />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2">&times;</button>
        </div>
        <div className="p-6 min-h-[400px] flex items-start justify-center">{renderContent()}</div>
        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3 rounded-b-lg">
            <button onClick={onClose} className="px-4 py-2 text-gray-300 bg-gray-700 rounded-md">Close</button>
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-white bg-indigo-600 rounded-md shadow-lg">{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const InfoManager: React.FC<{ settings: SettingsPayload, setSettings: (s: SettingsPayload) => void }> = ({ settings, setSettings }) => {
    const [newFaq, setNewFaq] = useState({ q: '', a: '' });

    const addFaq = () => {
        if (!newFaq.q || !newFaq.a) return;
        setSettings({ ...settings, shopInfo: { ...settings.shopInfo, faqs: [...(settings.shopInfo.faqs || []), { question: newFaq.q, answer: newFaq.a }] } });
        setNewFaq({ q: '', a: '' });
    };

    const removeFaq = (idx: number) => {
        const updated = [...settings.shopInfo.faqs];
        updated.splice(idx, 1);
        setSettings({ ...settings, shopInfo: { ...settings.shopInfo, faqs: updated } });
    };

    return (
        <div className="w-full space-y-6">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                <h4 className="text-white font-bold mb-4">Working Hours (24h format)</h4>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 block mb-1">Open Time</label>
                        <input type="time" value={settings.shopInfo.workingHours.start} onChange={e => setSettings({ ...settings, shopInfo: { ...settings.shopInfo, workingHours: { ...settings.shopInfo.workingHours, start: e.target.value } } })} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 block mb-1">Close Time</label>
                        <input type="time" value={settings.shopInfo.workingHours.end} onChange={e => setSettings({ ...settings, shopInfo: { ...settings.shopInfo, workingHours: { ...settings.shopInfo.workingHours, end: e.target.value } } })} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                <h4 className="text-white font-bold mb-2">About Us</h4>
                <textarea rows={3} value={settings.shopInfo.about} onChange={e => setSettings({ ...settings, shopInfo: { ...settings.shopInfo, about: e.target.value } })} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Tell customers about your shop..." />
            </div>

            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                <h4 className="text-white font-bold mb-2">Disclaimer</h4>
                <textarea rows={2} value={settings.shopInfo.disclaimer} onChange={e => setSettings({ ...settings, shopInfo: { ...settings.shopInfo, disclaimer: e.target.value } })} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="e.g. Prices subject to change..." />
            </div>

             <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                <h4 className="text-white font-bold mb-2">FAQs</h4>
                <div className="space-y-2 mb-4">
                    {settings.shopInfo.faqs?.map((faq, i) => (
                        <div key={i} className="bg-gray-800 p-2 rounded border border-gray-600 flex justify-between items-start">
                            <div><p className="text-xs font-bold text-gray-200">Q: {faq.question}</p><p className="text-xs text-gray-400">A: {faq.answer}</p></div>
                            <button onClick={() => removeFaq(i)} className="text-red-400"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <input placeholder="Question" value={newFaq.q} onChange={e => setNewFaq({...newFaq, q: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white" />
                    <div className="flex gap-2">
                        <input placeholder="Answer" value={newFaq.a} onChange={e => setNewFaq({...newFaq, a: e.target.value})} className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white" />
                        <button onClick={addFaq} className="bg-green-600 px-3 rounded text-white text-xs font-bold">Add</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MenuManager: React.FC<{ settings: SettingsPayload, setSettings: (s: SettingsPayload) => void }> = ({ settings, setSettings }) => {
    const [category, setCategory] = useState<'pizzas' | 'drinks' | 'deals'>('pizzas');
    const [pendingName, setPendingName] = useState('');
    const [pendingSizes, setPendingSizes] = useState<{label: string, price: number}[]>([]);
    const [sizeInput, setSizeInput] = useState({ label: '', price: '' });
    const [dealInput, setDealInput] = useState({ name: '', desc: '', price: '' });

    const handleDeleteItem = (type: 'pizzas' | 'drinks' | 'deals', index: number) => {
        const list = [...settings[type]];
        list.splice(index, 1);
        setSettings({ ...settings, [type]: list });
    };

    const handleAddSizeToPending = () => {
        if (!sizeInput.label || !sizeInput.price) return;
        setPendingSizes([...pendingSizes, { label: sizeInput.label, price: parseInt(sizeInput.price) }]);
        setSizeInput({ label: '', price: '' });
    };

    const handleSavePendingItem = () => {
        if (!pendingName || pendingSizes.length === 0) return;
        const sizesRecord: Record<string, number> = {};
        pendingSizes.forEach(s => sizesRecord[s.label] = s.price);
        const newItem: MenuItem = { name: pendingName, sizes: sizesRecord };
        if (category === 'pizzas') setSettings({ ...settings, pizzas: [...settings.pizzas, newItem] });
        else setSettings({ ...settings, drinks: [...settings.drinks, newItem] });
        setPendingName(''); setPendingSizes([]); setSizeInput({ label: '', price: '' });
    };

    const handleAddDeal = () => {
        if(!dealInput.name || !dealInput.price) return;
        const newDeal: Deal = { name: dealInput.name, description: dealInput.desc, price: parseInt(dealInput.price) };
        setSettings({ ...settings, deals: [...settings.deals, newDeal] });
        setDealInput({ name: '', desc: '', price: '' });
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex justify-center space-x-4 mb-6 border-b border-gray-700 pb-4">
                <button onClick={() => setCategory('pizzas')} className={`pb-1 ${category === 'pizzas' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>Pizzas</button>
                <button onClick={() => setCategory('drinks')} className={`pb-1 ${category === 'drinks' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>Drinks</button>
                <button onClick={() => setCategory('deals')} className={`pb-1 ${category === 'deals' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>Deals</button>
            </div>
            <div className="bg-gray-900/30 p-4 rounded border border-gray-700 max-h-60 overflow-y-auto custom-scrollbar">
                <ul className="space-y-2">
                    {settings[category].map((item: any, i: number) => (
                        <li key={i} className="flex justify-between items-center bg-gray-800 p-2 rounded text-sm border border-gray-700">
                            <div>
                                <span className="font-bold text-white">{item.name}</span>
                                <div className="text-xs text-gray-500 mt-1">
                                    {category === 'deals' ? `${item.description} - Rs.${item.price}` : Object.entries(item.sizes).map(([s, v]) => `${s}: ${v}`).join(', ')}
                                </div>
                            </div>
                            <button onClick={() => handleDeleteItem(category, i)} className="text-gray-500 hover:text-red-400 p-1"><TrashIcon className="w-4 h-4" /></button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg shadow-lg">
                {category === 'deals' ? (
                    <div className="space-y-3">
                        <input placeholder="Deal Name" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={dealInput.name} onChange={e => setDealInput({...dealInput, name: e.target.value})} />
                         <input placeholder="Description" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={dealInput.desc} onChange={e => setDealInput({...dealInput, desc: e.target.value})} />
                        <div className="flex gap-2">
                            <input placeholder="Price" type="number" className="w-1/3 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={dealInput.price} onChange={e => setDealInput({...dealInput, price: e.target.value})} />
                            <button onClick={handleAddDeal} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-sm">Add Deal</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                         <input placeholder={category === 'pizzas' ? "Pizza Name" : "Drink Name"} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={pendingName} onChange={e => setPendingName(e.target.value)} />
                        <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {pendingSizes.map((s, idx) => (
                                    <span key={idx} className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs flex items-center border border-gray-600">{s.label}: Rs.{s.price}<button onClick={() => setPendingSizes(pendingSizes.filter((_, i) => i !== idx))} className="ml-2 text-red-400"><XCircleIcon className="w-3 h-3"/></button></span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input placeholder="Size (e.g. Large)" className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white" value={sizeInput.label} onChange={e => setSizeInput({...sizeInput, label: e.target.value})} />
                                <input placeholder="Price" type="number" className="w-20 bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white" value={sizeInput.price} onChange={e => setSizeInput({...sizeInput, price: e.target.value})} />
                                <button onClick={handleAddSizeToPending} className="bg-gray-600 hover:bg-gray-500 px-3 rounded text-white"><PlusIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <button onClick={handleSavePendingItem} disabled={!pendingName || pendingSizes.length === 0} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded py-2 font-bold text-sm">Save Item</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const RiderManager: React.FC<{ settings: SettingsPayload, setSettings: (s: SettingsPayload) => void }> = ({ settings, setSettings }) => {
    const [newRider, setNewRider] = useState({ name: '', number: '' });
    const handleDelete = (index: number) => { const list = [...settings.riders]; list.splice(index, 1); setSettings({ ...settings, riders: list }); };
    const handleAdd = (e: React.FormEvent) => { e.preventDefault(); if (!newRider.name || !newRider.number) return; setSettings({ ...settings, riders: [...settings.riders, newRider] }); setNewRider({ name: '', number: '' }); };

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {settings.riders.map((rider, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-700/50 p-3 rounded">
                        <div><p className="font-bold text-gray-200">{rider.name}</p><p className="text-xs text-gray-400">{rider.number}</p></div>
                        <button onClick={() => handleDelete(i)} className="text-gray-500 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                ))}
            </div>
            <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-700 pt-4">
                <div className="flex gap-2">
                    <input placeholder="Rider Name" className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white" value={newRider.name} onChange={e => setNewRider({...newRider, name: e.target.value})} />
                    <input placeholder="Phone Number" className="w-1/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white" value={newRider.number} onChange={e => setNewRider({...newRider, number: e.target.value})} />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded px-4 py-2 text-white"><PlusIcon className="w-5 h-5" /></button>
                </div>
            </form>
        </div>
    );
};

const OperationsManager: React.FC<{ settings: SettingsPayload, setSettings: (s: SettingsPayload) => void }> = ({settings, setSettings}) => {
    const [newZone, setNewZone] = useState('');
    const handleAddZone = (e: React.FormEvent) => { e.preventDefault(); if (!newZone.trim()) return; setSettings({...settings, allowedZones: [...settings.allowedZones, newZone.trim()]}); setNewZone(''); }
    return (
       <div className="max-w-lg mx-auto w-full">
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2 bg-gray-900/50 p-3 rounded-md border border-gray-700 custom-scrollbar">
                {settings.allowedZones.map(zone => (
                    <div key={zone} className="flex items-center justify-between bg-gray-700/50 p-3 rounded group">
                        <p className="font-semibold text-gray-200">{zone}</p>
                        <button onClick={() => setSettings({...settings, allowedZones: settings.allowedZones.filter(z => z !== zone)})} className="text-gray-500 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                ))}
            </div>
            <form onSubmit={handleAddZone} className="flex gap-2">
                <input type="text" value={newZone} onChange={e => setNewZone(e.target.value)} placeholder="Add Zone" className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 text-sm text-white" />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded px-6 py-2 text-sm font-bold text-white">Add</button>
            </form>
        </div>
    );
}

export default SettingsManager;
