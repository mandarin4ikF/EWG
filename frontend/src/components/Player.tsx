import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordModal } from './WordModal';
import { uploadAudio, translateWord, api } from '../lib/api';
import {
    Activity, Play, Pause, RotateCcw, Sparkles,
    Upload, Info, Volume2, Maximize2, Headphones
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface LyricLine {
    time: number;
    text: string;
    translation?: string;
    tokens?: any[];
}

interface PlayerProps {
    track: {
        id: number;
        artist_name: string;
        track_name: string;
        lyrics: LyricLine[];
        duration: number;
        audio_url?: string | null;
    } | null;
    onWordAdded?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ track: initialTrack, onWordAdded }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [track, setTrack] = useState(initialTrack);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [selectedWord, setSelectedWord] = useState<{ word: string, context: string, translation?: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Practice Mode State
    const [practiceMode, setPracticeMode] = useState(false);
    const [clozeLyrics, setClozeLyrics] = useState<LyricLine[]>([]);
    const [userInputs, setUserInputs] = useState<{ [key: string]: string }>({});
    const [passedBlanks, setPassedBlanks] = useState<{ [key: string]: boolean }>({});
    const [grammarExplanation, setGrammarExplanation] = useState<{ lineIndex: number, text: string } | null>(null);
    const [isExplainingGrammar, setIsExplainingGrammar] = useState(false);

    useEffect(() => {
        setTrack(initialTrack);
        setPracticeMode(false);
        setPassedBlanks({});
    }, [initialTrack]);

    const togglePracticeMode = async () => {
        if (!practiceMode && track) {
            try {
                const res = await api.get(`/tracks/${track.id}/cloze`);
                setClozeLyrics(res.data.lyrics);
                setPracticeMode(true);
                setUserInputs({});
                setPassedBlanks({});
                if (audioRef.current) audioRef.current.currentTime = 0;
            } catch (err) {
                console.error("Failed to load practice mode:", err);
            }
        } else {
            setPracticeMode(false);
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        setDuration(audioRef.current.duration || 0);

        const lyricsToUse = practiceMode ? clozeLyrics : track?.lyrics;
        if (lyricsToUse) {
            const index = lyricsToUse.findIndex((line, i) => {
                const nextLine = lyricsToUse[i + 1];
                return time >= line.time && (!nextLine || time < nextLine.time);
            });

            if (index !== -1 && index !== activeLineIndex) {
                setActiveLineIndex(index);
                const el = document.getElementById(`line-${index}`);
                if (el && containerRef.current) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            // Word-level precise pause in practice mode
            if (practiceMode && lyricsToUse[index]?.tokens && audioRef.current && !audioRef.current.paused) {
                const line = lyricsToUse[index];
                const nextLine = lyricsToUse[index + 1];
                const lineDuration = nextLine ? (nextLine.time - line.time) : (track?.duration ? track.duration - line.time : 5);
                const totalChars = line.text.length || 1;
                let currentCharOffset = 0;

                for (let tI = 0; tI < line.tokens!.length; tI++) {
                    const token = line.tokens![tI];
                    const key = `${index}-${tI}`;
                    const wordStartTime = line.time + (currentCharOffset / totalChars) * lineDuration;

                    if (token.is_cloze && !passedBlanks[key] && time >= wordStartTime) {
                        if (userInputs[key]?.toLowerCase() !== token.clean_text?.toLowerCase()) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                            break;
                        }
                    }
                    currentCharOffset += token.text.length + 1;
                }
            }
        }
    };

    const handleSeek = (newTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleWordClick = async (word: string, context: string) => {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        const cleanWord = word.replace(/[.,!?]/g, '');
        setSelectedWord({ word: cleanWord, context });
        try {
            const res = await translateWord(cleanWord);
            setSelectedWord({ word: cleanWord, context, translation: res.translation });
        } catch (err) {
            console.error("Translation failed", err);
        }
    };

    const handleExplainGrammar = async (lineIdx: number, text: string) => {
        setIsExplainingGrammar(true);
        setGrammarExplanation({ lineIndex: lineIdx, text: "Generating deep analysis..." });
        try {
            const res = await api.post('/ai/grammar', { line: text });
            setGrammarExplanation({ lineIndex: lineIdx, text: res.data.explanation });
        } catch (err) {
            setGrammarExplanation({ lineIndex: lineIdx, text: "Failed to reach AI Core." });
        } finally {
            setIsExplainingGrammar(false);
        }
    };

    if (!track) return null;

    const currentLyrics = practiceMode ? clozeLyrics : track.lyrics;

    return (
        <div className="flex flex-col h-full bg-[var(--vanta-bg)] relative">
            {selectedWord && (
                <WordModal
                    word={selectedWord.word}
                    context={selectedWord.context}
                    initialTranslation={selectedWord.translation}
                    onClose={() => setSelectedWord(null)}
                    onSaved={onWordAdded}
                />
            )}

            {/* Header / Stats Overlay */}
            <div className="absolute top-0 inset-x-0 p-6 z-20 pointer-events-none">
                <div className="flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="pointer-events-auto"
                    >
                        <h2 className="text-2xl font-black tracking-tight text-white mb-1">{track.track_name}</h2>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--vanta-accent-blue)]">
                            <Headphones size={14} />
                            <span>{track.artist_name}</span>
                        </div>
                    </motion.div>

                    <div className="pointer-events-auto flex items-center gap-3">
                        <button
                            onClick={togglePracticeMode}
                            className={cn(
                                "h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all",
                                practiceMode ? "bg-purple-600 shadow-lg shadow-purple-500/20" : "bg-[var(--vanta-surface-bright)] border border-[var(--vanta-border)] hover:border-slate-500"
                            )}
                        >
                            <Activity size={16} className={practiceMode ? 'animate-pulse' : ''} />
                            {practiceMode ? "PRACTICE ON" : "TRAINING MODE"}
                        </button>

                        <label className="vanta-button-secondary h-10 px-4 cursor-pointer">
                            <Upload size={16} />
                            <span className="text-xs font-bold uppercase">Audio</span>
                            <input type="file" accept="audio/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && audioRef.current) {
                                    audioRef.current.src = URL.createObjectURL(file);
                                    handlePlayPause();
                                    uploadAudio(track.id, file).then(t => setTrack(t));
                                }
                            }} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Lyrics Engine */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-8 py-48 space-y-12 text-center scroll-smooth scrollbar-hide">
                <AnimatePresence mode="popLayout">
                    {currentLyrics.map((line, i) => {
                        const isActive = i === activeLineIndex;
                        return (
                            <motion.div
                                key={`${i}-${practiceMode}`}
                                id={`line-${i}`}
                                initial={{ opacity: 0.1, scale: 0.9 }}
                                animate={{
                                    opacity: isActive ? 1 : (Math.abs(i - activeLineIndex) < 4 ? 0.3 : 0.05),
                                    scale: isActive ? 1.05 : 1,
                                    y: isActive ? 0 : 10
                                }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                className="relative py-4 cursor-pointer group"
                                onClick={() => { if (!practiceMode && audioRef.current) audioRef.current.currentTime = line.time; }}
                            >
                                <div className="inline-block max-w-4xl relative">
                                    <div className={cn(
                                        "text-3xl font-black tracking-tight flex justify-center flex-wrap gap-x-3 transition-colors duration-500",
                                        isActive ? "text-white" : "text-slate-500"
                                    )}>
                                        {practiceMode && line.tokens ? (
                                            line.tokens.map((token: any, tI: number) => (
                                                token.is_cloze ? (
                                                    <input
                                                        key={tI}
                                                        className={cn(
                                                            "w-36 text-center bg-[var(--vanta-surface-bright)] border-b-2 outline-none transition-all py-1 rounded-t-lg",
                                                            passedBlanks[`${i}-${tI}`]
                                                                ? "border-green-500 text-green-400 bg-green-500/5"
                                                                : "border-[var(--vanta-accent-blue)] focus:border-white text-white"
                                                        )}
                                                        value={userInputs[`${i}-${tI}`] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setUserInputs(p => ({ ...p, [`${i}-${tI}`]: val }));
                                                            if (val.toLowerCase() === token.clean_text.toLowerCase()) {
                                                                setPassedBlanks(p => ({ ...p, [`${i}-${tI}`]: true }));
                                                                if (audioRef.current?.paused) audioRef.current.play();
                                                                setIsPlaying(true);
                                                            }
                                                        }}
                                                        placeholder="..."
                                                    />
                                                ) : (
                                                    <span key={tI}>{token.text}</span>
                                                )
                                            ))
                                        ) : (
                                            line.text.split(' ').map((word: string, wI: number) => (
                                                <motion.span
                                                    key={wI}
                                                    whileHover={{ scale: 1.1, color: "var(--vanta-accent-blue)" }}
                                                    className="inline-block transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); handleWordClick(word, line.text); }}
                                                >
                                                    {word}
                                                </motion.span>
                                            ))
                                        )}
                                    </div>

                                    {/* Line Actions */}
                                    <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleExplainGrammar(i, line.text); }} className="p-2 bg-[var(--vanta-surface-bright)] rounded-full hover:text-[var(--vanta-accent-purple)] border border-[var(--vanta-border)]">
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                </div>

                                {line.translation && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: isActive ? 1 : 0.4 }}
                                        className="text-lg font-medium text-[var(--text-muted)] mt-4 max-w-2xl mx-auto italic"
                                    >
                                        {line.translation}
                                    </motion.div>
                                )}

                                {/* Grammar Portal */}
                                <AnimatePresence>
                                    {grammarExplanation?.lineIndex === i && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="mt-8 mx-auto max-w-3xl vanta-panel p-6 text-left relative z-10 vanta-glass"
                                        >
                                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--vanta-border)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Sparkles size={18} /></div>
                                                    <h4 className="font-black text-xs uppercase tracking-widest">Grammar Core Analysis</h4>
                                                </div>
                                                <button onClick={() => setGrammarExplanation(null)} className="text-[var(--text-muted)] hover:text-white"><Pause size={14} /></button>
                                            </div>
                                            <div className="text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">{grammarExplanation.text}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Custom Control Bar */}
            <div className="absolute bottom-10 inset-x-0 px-8 z-30">
                <div className="max-w-4xl mx-auto vanta-glass rounded-3xl p-4 border border-[var(--vanta-border)] shadow-2xl">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handlePlayPause}
                            className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                        >
                            {isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" size={24} className="ml-1" />}
                        </button>

                        <div className="flex-1 group">
                            <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] mb-2 uppercase tracking-widest">
                                <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                                <span>{Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative overflow-hidden" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                handleSeek((x / rect.width) * duration);
                            }}>
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-white"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 blur-sm" style={{ width: `${(currentTime / duration) * 100}%` }} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-[var(--text-muted)]">
                            <Volume2 size={20} className="hover:text-white cursor-pointer transition-colors" />
                            <Maximize2 size={20} className="hover:text-white cursor-pointer transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
    );
};
