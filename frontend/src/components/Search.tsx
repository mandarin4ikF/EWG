import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTracks, importTrack } from '../lib/api';
import { Loader2, Search as SearchIcon, X } from 'lucide-react';

interface SearchProps {
    onTrackSelect: (track: any) => void;
}

export const Search: React.FC<SearchProps> = ({ onTrackSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await searchTracks(query);
            setResults(res);
            setIsFocused(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (lrclib_id: number) => {
        setLoading(true);
        try {
            const track = await importTrack(lrclib_id);
            onTrackSelect(track);
            setResults([]);
            setQuery('');
            setIsFocused(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={searchRef} className="relative w-full group">
            <form onSubmit={handleSearch} className="relative group/form">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/form:text-[var(--vanta-accent-blue)] transition-colors">
                    <SearchIcon size={18} />
                </div>
                <input
                    type="text"
                    value={query}
                    onFocus={() => setIsFocused(true)}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search artist or song title..."
                    className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-[var(--vanta-surface-bright)] border border-[var(--vanta-border)] focus:outline-none focus:border-[var(--vanta-accent-blue)] focus:ring-4 focus:ring-[var(--vanta-accent-glow)] transition-all text-sm placeholder:text-[var(--text-muted)]"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}

                {loading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-[var(--vanta-accent-blue)]" />
                    </div>
                )}
            </form>

            <AnimatePresence>
                {isFocused && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-2 p-2 bg-[var(--vanta-surface-bright)] border border-[var(--vanta-border)] rounded-2xl shadow-2xl z-[100] max-h-[400px] overflow-y-auto vanta-glass"
                    >
                        {results.map(r => (
                            <button
                                key={r.id}
                                className="w-full p-3 flex flex-col items-start gap-0.5 hover:bg-white/5 rounded-xl transition-colors group/item"
                                onClick={() => handleSelect(r.id)}
                            >
                                <div className="font-semibold text-sm text-[var(--text-primary)] group-hover/item:text-[var(--vanta-accent-blue)] transition-colors line-clamp-1">{r.trackName}</div>
                                <div className="text-xs text-[var(--text-muted)] group-hover/item:text-[var(--text-secondary)] transition-colors">{r.artistName}</div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
