
import React, { useState } from 'react';
import { AdminIcon, XCircleIcon } from './icons';

interface AdminLoginProps {
    correctKey: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ correctKey, onSuccess, onCancel }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputKey === correctKey) {
            onSuccess();
        } else {
            setError(true);
            setInputKey('');
        }
    };

    return (
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 animate-fade-in-down">
            <div className="flex justify-center mb-6">
                <div className="p-3 bg-indigo-600 rounded-full">
                    <AdminIcon className="w-8 h-8 text-white" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Shop Owner Access</h2>
            <p className="text-center text-gray-400 mb-6">Please enter your secret key to access the dashboard.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-400 mb-1">Secret Key</label>
                    <input 
                        type="password" 
                        value={inputKey}
                        onChange={(e) => {
                            setInputKey(e.target.value);
                            setError(false);
                        }}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Enter key..."
                        autoFocus
                    />
                </div>
                {error && (
                    <div className="flex items-center text-red-400 text-sm mb-4">
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        Invalid Key. Please try again.
                    </div>
                )}
                <div className="flex gap-3">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                    >
                        Login
                    </button>
                </div>
            </form>
            <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">If you lost your key, please contact support.</p>
            </div>
        </div>
    );
};

export default AdminLogin;
