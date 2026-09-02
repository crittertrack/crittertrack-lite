import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

// Lets the user toggle which collections a single animal belongs to, and create a new
// collection inline (auto-assigning the current animal to it).
const AssignCollectionsModal = ({
    animalId,
    collections,
    animalMap,
    onToggle,
    onCreate,
    onClose,
}) => {
    const [newName, setNewName] = useState('');
    const memberIds = animalMap[animalId] || [];

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        onCreate(newName, animalId);
        setNewName('');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-800">Collections</p>
                    <button onClick={onClose} className="p-1 rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5">
                    {collections.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">No collections yet. Create one below.</p>
                    ) : collections.map((c) => {
                        const checked = memberIds.includes(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => onToggle(animalId, c.id)}
                                className="w-full flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-left"
                            >
                                <span className="text-sm text-gray-800">{c.name}</span>
                                <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-accent border-accent text-white' : 'border-gray-300'}`}>
                                    {checked && <Check size={13} />}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <form onSubmit={handleCreate} className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New collection name..."
                        className="flex-1 text-sm bg-gray-50 rounded-lg px-3 py-2 outline-none"
                    />
                    <button type="submit" className="p-2.5 rounded-lg bg-accent text-white flex-shrink-0"><Plus size={16} /></button>
                </form>
            </div>
        </div>
    );
};

export default AssignCollectionsModal;
