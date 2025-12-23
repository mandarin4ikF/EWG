import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Book, Dumbbell, Play } from 'lucide-react';

export const Library: React.FC = () => {
    const [mode, setMode] = useState<'words' | 'exercises'>('words');
    const [words, setWords] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);

    useEffect(() => {
        if (mode === 'words') loadWords();
    }, [mode]);

    const loadWords = async () => {
        const res = await api.get('/users/words');
        setWords(res.data);
    };

    const generateExercises = async () => {
        setMode('exercises');
        const res = await api.get('/exercises/generate');
        setExercises(res.data);
    };

    return (
        <div className="bg-slate-900 border-l border-slate-800 w-80 flex flex-col h-full absolute right-0 top-0 z-40 transform transition-transform">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2"><Book size={18} /> Library</h2>
                <div className="flex bg-slate-800 rounded p-1 text-xs">
                    <button
                        onClick={() => setMode('words')}
                        className={`px-3 py-1 rounded ${mode === 'words' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                    >Words</button>
                    <button
                        onClick={generateExercises}
                        className={`px-3 py-1 rounded flex gap-1 ${mode === 'exercises' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                    ><Dumbbell size={14} /> Train</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {mode === 'words' ? (
                    <div className="space-y-2">
                        {words.map(w => (
                            <div key={w.id} className="bg-slate-800 p-2 rounded border border-slate-700">
                                <div className="flex justify-between font-bold">
                                    <span className="text-yellow-400">{w.word}</span>
                                    <span>{w.translation}</span>
                                </div>
                                <div className="text-xs text-slate-500 truncate mt-1">{w.context_phrase}</div>
                            </div>
                        ))}
                        {words.length === 0 && <div className="text-center text-slate-500 mt-10">Dictionary is empty</div>}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {exercises.map(ex => (
                            <div key={ex.id} className="bg-slate-800 p-3 rounded border border-slate-700">
                                <div className="font-bold mb-2 text-sm">{ex.question}</div>
                                <div className="space-y-1">
                                    {ex.options.map((opt: string) => (
                                        <button key={opt} className="w-full text-left px-2 py-1 bg-slate-900 rounded text-xs hover:bg-slate-700">
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {exercises.length === 0 && <div className="text-center text-slate-500 mt-10">No exercises generated</div>}
                    </div>
                )}
            </div>
        </div>
    );
};
