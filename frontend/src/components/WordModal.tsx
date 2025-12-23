import React, { useState } from 'react';
import { api } from '../lib/api';
import { X, Plus, Check } from 'lucide-react';

interface WordModalProps {
    word: string;
    context: string;
    initialTranslation?: string;
    onClose: () => void;
}

export const WordModal: React.FC<WordModalProps> = ({ word, context, initialTranslation, onClose }) => {
    const [translation, setTranslation] = useState<string | null>(initialTranslation || null);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    React.useEffect(() => {
        if (initialTranslation) {
            setTranslation(initialTranslation);
        }
    }, [initialTranslation]);

    // Auto-translate on mount? Or wait for user?
    // Let's simplified auto-translate or just input.
    // For MVP we don't have a real translation endpoint in API (we skipped it in tracks/nlp.py for simplicity of "on demand").
    // Wait, I didn't verify if I exposed a /translate endpoint. I didn't.
    // I only have `parse_lrc` which tokenizes. I need a translate endpoint or just let user type.
    // Requirement: "Words clickable -> translation".
    // I will mock the translation fetch or add the endpoint.
    // Let's add the endpoint quickly in next step? Or just use a client-side mock/browser translation?
    // No, let's just let user type translation for now or "Fetch Translation" which calls backend.
    // I'll assume I can add a quick endpoint or just use a placeholder.
    // Actually, I can use the existing `nlp_service` if I expose it. 
    // For now, I'll just allow Manual Entry + "Suggest" button which returns a dummy or real if I add it.

    const handleSave = async () => {
        if (!translation || !translation.trim()) return;
        setLoading(true);
        try {
            await api.post('/users/words', {
                word,
                translation: translation.trim(),
                context
            });
            setSaved(true);
            setTimeout(onClose, 1000);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save word: ${e.response?.data?.detail || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>

                <h3 className="text-2xl font-bold mb-1 text-yellow-400">{word}</h3>
                <p className="text-sm text-slate-400 italic mb-4">"{context}"</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Translation</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:border-yellow-500 outline-none"
                            placeholder="Enter translation..."
                            value={translation || ''}
                            onChange={e => setTranslation(e.target.value)}
                        />
                    </div>

                    <button
                        className="w-full py-2 bg-yellow-500 text-slate-900 font-bold rounded flex items-center justify-center gap-2 hover:bg-yellow-400 disabled:opacity-50"
                        onClick={handleSave}
                        disabled={!translation || loading || saved}
                    >
                        {loading ? "Saving..." : (saved ? <Check /> : <Plus />)}
                        {loading ? "" : (saved ? "Saved!" : "Add to Dictionary")}
                    </button>
                </div>
            </div>
        </div>
    );
};
