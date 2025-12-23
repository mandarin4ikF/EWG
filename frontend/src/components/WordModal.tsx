import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, aiExplainWord } from '../lib/api';
import { X, Plus, Check, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface WordModalProps {
    word: string;
    context: string;
    initialTranslation?: string;
    onClose: () => void;
    onSaved?: () => void;
}

export const WordModal: React.FC<WordModalProps> = ({ word, context, initialTranslation, onClose, onSaved }) => {
    const [translation, setTranslation] = useState<string | null>(initialTranslation || null);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (initialTranslation) {
            setTranslation(initialTranslation);
        }
    }, [initialTranslation]);

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
            if (onSaved) onSaved();
            setTimeout(onClose, 1000);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAIExplain = async () => {
        setAiLoading(true);
        try {
            const res = await aiExplainWord(word, context);
            setAiExplanation(res.explanation);
        } catch (e) {
            console.error(e);
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg vanta-panel vanta-glass relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[var(--vanta-border)] overflow-hidden"
            >
                {/* Header Section */}
                <div className="p-8 border-b border-[var(--vanta-border)] bg-gradient-to-br from-white/5 to-transparent">
                    <button onClick={onClose} className="absolute top-6 right-6 text-[var(--text-muted)] hover:text-white transition-colors">
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-[var(--vanta-accent-blue)]/20 text-[var(--vanta-accent-blue)] rounded-xl">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">{word}</h3>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                            "{context}"
                        </p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Translation Input */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex justify-between">
                            <span>Universal Translation</span>
                            <span className="text-[var(--vanta-accent-blue)]">Auto-detected</span>
                        </label>
                        <div className="flex gap-3">
                            <input
                                className="flex-1 bg-[var(--vanta-surface-bright)] border border-[var(--vanta-border)] rounded-xl px-5 py-4 focus:border-[var(--vanta-accent-blue)] focus:ring-4 focus:ring-[var(--vanta-accent-glow)] outline-none transition-all text-lg font-medium placeholder:text-[var(--text-muted)]"
                                placeholder="Edit translation..."
                                value={translation || ''}
                                onChange={e => setTranslation(e.target.value)}
                            />
                            <button
                                onClick={handleAIExplain}
                                disabled={aiLoading}
                                className="vanta-button-primary h-auto w-16 flex items-center justify-center p-0 rounded-xl"
                                title="Run AI Diagnostics"
                            >
                                {aiLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                            </button>
                        </div>
                    </div>

                    {/* AI Wisdom Reveal */}
                    <AnimatePresence>
                        {aiExplanation && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-[var(--vanta-accent-purple)]/5 border border-[var(--vanta-accent-purple)]/20 p-5 rounded-2xl relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-3 text-[var(--vanta-accent-purple)]/20 group-hover:text-[var(--vanta-accent-purple)]/40 transition-colors">
                                    <Sparkles size={40} />
                                </div>
                                <div className="text-[var(--vanta-accent-purple)] font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    AI Linguistic Engine
                                </div>
                                <div className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap relative z-10">
                                    {aiExplanation}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action Button */}
                    <button
                        className={cn(
                            "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl",
                            saved
                                ? "bg-green-500 text-white cursor-default"
                                : "bg-white text-black hover:bg-slate-100 hover:shadow-white/10"
                        )}
                        onClick={handleSave}
                        disabled={!translation || loading || saved}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            saved ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />
                        )}
                        {loading ? "PROCESSING..." : (saved ? "STORED IN MEMORY" : "ADD TO DICTIONARY")}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

