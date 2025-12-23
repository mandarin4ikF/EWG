import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import {
    Book, Dumbbell, Play, Trash2, Sparkles,
    Wand2, RotateCcw, BarChart3, TrendingUp,
    ChevronRight, Trophy, Zap
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const Library: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
    const [mode, setMode] = useState<'words' | 'exercises' | 'story' | 'stats'>('words');
    const [words, setWords] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [story, setStory] = useState<{ story: string, words: any[] } | null>(null);
    const [stats, setStats] = useState<{ growth: any[], mastery: any[] }>({ growth: [], mastery: [] });
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    useEffect(() => {
        if (mode === 'words') loadWords();
    }, [mode, refreshTrigger]);

    const loadWords = async () => {
        const res = await api.get('/users/words');
        setWords(res.data);
    };

    const handleDeleteWord = async (id: number) => {
        if (!confirm('Delete this word?')) return;
        try {
            await api.delete(`/users/words/${id}`);
            loadWords();
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerateStory = async () => {
        setMode('story');
        setIsGeneratingStory(true);
        setStory(null);
        try {
            const res = await api.post('/ai/story');
            setStory(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingStory(false);
        }
    };

    const handleLoadStats = async () => {
        setMode('stats');
        setIsLoadingStats(true);
        try {
            const [growthRes, masteryRes] = await Promise.all([
                api.get('/stats/vocabulary-growth'),
                api.get('/stats/mastery-stats')
            ]);
            setStats({ growth: growthRes.data, mastery: masteryRes.data });
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const generateExercises = async () => {
        setMode('exercises');
        try {
            const res = await api.get('/exercises/generate');
            setExercises(res.data);
            setSelectedAnswer({});
            setIsCorrect({});
        } catch (e) {
            console.error(e);
        }
    };

    const [selectedAnswer, setSelectedAnswer] = useState<{ [key: number]: string }>({});
    const [isCorrect, setIsCorrect] = useState<{ [key: number]: boolean }>({});

    const handleAnswer = (exId: number, option: string, correct: string) => {
        const correctFlag = option === correct;
        setSelectedAnswer(prev => ({ ...prev, [exId]: option }));
        setIsCorrect(prev => ({ ...prev, [exId]: correctFlag }));
    };

    const submitReview = async (wordId: number, quality: number) => {
        try {
            await api.post('/exercises/review', { word_id: wordId, quality });
            setExercises(prev => prev.filter(ex => ex.id !== wordId));
            if (mode === 'words') loadWords();
        } catch (e) {
            console.error(e);
        }
    };

    const tabs = [
        { id: 'words', icon: Book, label: 'Vault' },
        { id: 'exercises', icon: Dumbbell, label: 'Drill', onClick: generateExercises },
        { id: 'story', icon: Wand2, label: 'Story', onClick: handleGenerateStory },
        { id: 'stats', icon: BarChart3, label: 'Intel', onClick: handleLoadStats }
    ];

    return (
        <div className="flex flex-col h-full bg-[var(--vanta-surface)] relative">
            {/* User Glance */}
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-[var(--vanta-surface)] flex items-center justify-center font-bold text-xs uppercase">
                                MG
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-bold">User</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--vanta-accent-blue)]">
                                <Zap size={10} fill="currentColor" />
                                <span className="font-bold">7 DAY STREAK</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="flex bg-[var(--vanta-surface-bright)] p-1 rounded-xl border border-[var(--vanta-border)] mb-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = mode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => tab.onClick ? tab.onClick() : setMode(tab.id as any)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all relative",
                                    isActive ? "text-[var(--vanta-accent-blue)] bg-white/5 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-1 left-1 right-1 h-0.5 bg-[var(--vanta-accent-blue)] rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                <AnimatePresence mode="wait">
                    {mode === 'words' ? (
                        <motion.div
                            key="words"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Vocabulary Bank</h3>
                                <span className="text-[10px] font-bold text-[var(--text-muted)]">{words.length} WORDS</span>
                            </div>
                            {words.map(w => (
                                <motion.div
                                    layout
                                    key={w.id}
                                    className="vanta-card group relative p-3 bg-gradient-to-br from-[var(--vanta-surface-bright)] to-[var(--vanta-surface)]"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-bold text-[var(--vanta-accent-blue)]">{w.word}</span>
                                        <button
                                            onClick={() => handleDeleteWord(w.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 transition-all rounded"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="text-xs font-medium text-[var(--text-primary)] mb-2">{w.translation}</div>
                                    <div className="text-[10px] text-[var(--text-muted)] italic leading-tight line-clamp-2">"{w.context_phrase}"</div>

                                    {w.review_count > 0 && (
                                        <div className="mt-2 pt-2 border-t border-[var(--vanta-border)] flex gap-1">
                                            {[...Array(Math.min(5, w.review_count))].map((_, i) => (
                                                <div key={i} className="w-1 h-1 rounded-full bg-[var(--vanta-accent-blue)]" />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {words.length === 0 && (
                                <div className="text-center py-12 text-[var(--text-muted)] text-sm"> Vault is empty</div>
                            )}
                        </motion.div>
                    ) : mode === 'exercises' ? (
                        <motion.div
                            key="exercises"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {exercises.map(ex => (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    key={ex.id}
                                    className="vanta-panel p-4 bg-[var(--vanta-surface-bright)]"
                                >
                                    <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3 tracking-widest flex items-center gap-2">
                                        <Dumbbell size={12} /> Active Recall
                                    </div>
                                    <div className="font-bold mb-4 text-[13px] leading-relaxed text-[var(--text-primary)]">{ex.question}</div>
                                    <div className="space-y-2">
                                        {ex.options.map((opt: string) => (
                                            <button
                                                key={opt}
                                                onClick={() => handleAnswer(ex.id, opt, ex.correct_answer)}
                                                disabled={!!selectedAnswer[ex.id]}
                                                className={cn(
                                                    "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all border",
                                                    selectedAnswer[ex.id] === opt
                                                        ? (opt === ex.correct_answer ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500')
                                                        : (selectedAnswer[ex.id] && opt === ex.correct_answer ? 'bg-green-500/50 border-green-500 text-white' : 'bg-[var(--vanta-surface)] border-[var(--vanta-border)] hover:border-slate-600')
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedAnswer[ex.id] && (
                                        <div className="mt-4 pt-4 border-t border-[var(--vanta-border)]">
                                            <div className="text-[9px] uppercase text-[var(--text-muted)] font-black mb-3 text-center">Rate Difficulty</div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {[
                                                    { q: 0, label: 'Lost', color: 'hover:bg-red-500' },
                                                    { q: 1, label: 'Hard', color: 'hover:bg-orange-500' },
                                                    { q: 2, label: 'Good', color: 'hover:bg-blue-500' },
                                                    { q: 3, label: 'Easy', color: 'hover:bg-green-500' }
                                                ].map(btn => (
                                                    <button
                                                        key={btn.q}
                                                        onClick={() => submitReview(ex.id, btn.q)}
                                                        className={cn("py-1.5 rounded-lg bg-[var(--vanta-surface)] border border-[var(--vanta-border)] text-[9px] font-bold transition-colors", btn.color)}
                                                    >
                                                        {btn.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {exercises.length === 0 && (
                                <div className="text-center py-12 space-y-4">
                                    <div className="text-sm text-[var(--text-muted)] font-medium">Daily training complete!</div>
                                    <button onClick={() => setMode('words')} className="vanta-button-secondary py-1 text-xs">Back to Vault</button>
                                </div>
                            )}
                        </motion.div>
                    ) : mode === 'story' ? (
                        <motion.div
                            key="story"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {isGeneratingStory && (
                                <div className="text-center py-20 text-[var(--text-muted)] animate-pulse space-y-4">
                                    <Sparkles size={40} className="mx-auto text-[var(--vanta-accent-blue)] opacity-50" />
                                    <div className="text-sm font-medium tracking-wide">Synthesizing Examples...</div>
                                </div>
                            )}
                            {story && (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="vanta-panel p-5 bg-gradient-to-b from-[var(--vanta-surface-bright)] to-[var(--vanta-surface)]"
                                >
                                    <div className="text-[var(--vanta-accent-blue)] text-xs font-black uppercase mb-4 flex items-center gap-2 tracking-tighter">
                                        <Sparkles size={14} fill="currentColor" /> Practical Context Guide
                                    </div>
                                    <div className="text-[13px] leading-relaxed text-[var(--text-primary)] mb-6 whitespace-pre-wrap font-medium">
                                        {story.story}
                                    </div>
                                    <div className="pt-4 border-t border-[var(--vanta-border)]">
                                        <div className="text-[9px] text-[var(--text-muted)] font-black uppercase mb-3">Target Lexicon</div>
                                        <div className="flex flex-wrap gap-2">
                                            {story.words.map((w, idx) => (
                                                <span key={idx} className="bg-[var(--vanta-surface)] px-2.5 py-1 rounded-lg text-[10px] text-[var(--vanta-accent-blue)] border border-[var(--vanta-border)] font-bold">
                                                    {w.word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGenerateStory}
                                        className="vanta-button-primary w-full mt-6 text-xs h-10"
                                    >
                                        <RotateCcw size={14} /> Refresh Scenario
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : mode === 'stats' ? (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            <div className="vanta-panel p-5 bg-[var(--vanta-surface-bright)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2 font-mono">
                                        <TrendingUp size={14} className="text-[var(--vanta-accent-blue)]" /> Growth Line
                                    </h3>
                                    <div className="text-xl font-black text-white">{stats.growth.length > 0 ? stats.growth[stats.growth.length - 1].count : 0}</div>
                                </div>
                                <div className="h-28 w-full -mx-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stats.growth}>
                                            <Tooltip content={<div className="vanta-glass p-2 text-[10px] rounded-lg border border-[var(--vanta-border)] shadow-2xl">Count: {stats.growth.length}</div>} />
                                            <Line
                                                type="monotone"
                                                dataKey="count"
                                                stroke="var(--vanta-accent-blue)"
                                                strokeWidth={3}
                                                dot={false}
                                                animationDuration={1500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[9px] text-[var(--text-muted)] mt-2 font-medium">Mastered words over time</p>
                            </div>

                            <div className="vanta-panel p-5 bg-[var(--vanta-surface-bright)]">
                                <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2 mb-4 font-mono">
                                    <BarChart3 size={14} className="text-[var(--vanta-accent-purple)]" /> Mastery Heat
                                </h3>
                                <div className="h-28 w-full -mx-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.mastery}>
                                            <defs>
                                                <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--vanta-accent-purple)" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="var(--vanta-accent-purple)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="var(--vanta-accent-purple)"
                                                fill="url(#colorHeat)"
                                                strokeWidth={3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {stats.mastery.map((m, idx) => (
                                        <div key={idx} className="bg-[var(--vanta-surface)] p-2 rounded-xl border border-[var(--vanta-border)]">
                                            <div className="text-[8px] text-[var(--text-muted)] uppercase font-black">{m.level}</div>
                                            <div className="text-xs font-black">{m.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
};
