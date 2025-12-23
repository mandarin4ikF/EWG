import React, { useRef, useState, useEffect } from 'react';
import { WordModal } from './WordModal';
import { uploadAudio } from '../lib/api';

interface LyricLine {
    time: number;
    text: string;
    translation?: string;
}

interface PlayerProps {
    track: {
        id: number;
        artist_name: string;
        track_name: string;
        lyrics: LyricLine[];
        audio_url?: string | null;
    } | null;
}

import { translateWord } from '../lib/api';

export const Player: React.FC<PlayerProps> = ({ track: initialTrack }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [track, setTrack] = useState(initialTrack);
    const [currentTime, setCurrentTime] = useState(0);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [selectedWord, setSelectedWord] = useState<{ word: string, context: string, translation?: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setTrack(initialTrack);
    }, [initialTrack]);

    useEffect(() => {
        if (track) {
            setCurrentTime(0);
            setActiveLineIndex(-1);
            if (audioRef.current) {
                if (track.audio_url) {
                    audioRef.current.src = track.audio_url;
                    audioRef.current.load();
                } else {
                    audioRef.current.src = "";
                }
            }
        }
    }, [track?.id, track?.audio_url]);

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        if (track?.lyrics) {
            const index = track.lyrics.findIndex((line, i) => {
                const nextLine = track.lyrics[i + 1];
                return time >= line.time && (!nextLine || time < nextLine.time);
            });
            if (index !== -1 && index !== activeLineIndex) {
                setActiveLineIndex(index);
                const el = document.getElementById(`line-${index}`);
                if (el && containerRef.current) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && track) {
            if (audioRef.current) {
                audioRef.current.src = URL.createObjectURL(file);
                audioRef.current.play();
            }

            setIsUploading(true);
            try {
                const updatedTrack = await uploadAudio(track.id, file);
                setTrack(updatedTrack);
            } catch (err) {
                console.error("Upload failed", err);
                alert("Failed to save audio to server");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleWordClick = async (word: string, context: string) => {
        if (audioRef.current) audioRef.current.pause();
        const cleanWord = word.replace(/[.,!?]/g, '');
        setSelectedWord({ word: cleanWord, context });

        try {
            const res = await translateWord(cleanWord);
            setSelectedWord({ word: cleanWord, context, translation: res.translation });
        } catch (err) {
            console.error("Translation failed", err);
        }
    };

    if (!track) return <div className="text-center p-10 text-gray-500">Select a track to start</div>;

    return (
        <div className="flex flex-col h-full max-h-screen relative">
            {selectedWord && (
                <WordModal
                    word={selectedWord.word}
                    context={selectedWord.context}
                    initialTranslation={selectedWord.translation}
                    onClose={() => setSelectedWord(null)}
                />
            )}

            <div className="bg-slate-800 p-4 border-b border-slate-700 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold">{track.track_name} - {track.artist_name}</h2>
                    {track.audio_url ? (
                        <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">
                            Audio saved on server
                        </span>
                    ) : (
                        <span className="text-xs bg-yellow-600 px-2 py-1 rounded text-white italic">
                            {isUploading ? "Uploading..." : "No audio file yet"}
                        </span>
                    )}
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 mb-1">
                            {track.audio_url ? "Replace file:" : "Upload MP3:"}
                        </span>
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                        />
                    </div>
                    <audio
                        ref={audioRef}
                        controls
                        className="w-full h-10"
                        onTimeUpdate={handleTimeUpdate}
                    />
                </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-6 text-center pb-32">
                {track.lyrics.map((line, i) => (
                    <div
                        key={i}
                        id={`line-${i}`}
                        className={`transition-all duration-300 ${i === activeLineIndex ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                        onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime = line.time;
                        }}
                    >
                        <div className={`text-xl font-bold ${i === activeLineIndex ? 'text-blue-400' : 'text-white'}`}>
                            {line.text.split(' ').map((word, wI) => (
                                <span
                                    key={wI}
                                    className="word-span mx-1 hover:text-blue-300 cursor-pointer transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleWordClick(word, line.text);
                                    }}
                                >
                                    {word}
                                </span>
                            ))}
                        </div>
                        {line.translation && (
                            <div className={`text-sm mt-1 italic ${i === activeLineIndex ? 'text-blue-200' : 'text-gray-400'}`}>
                                {line.translation}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
