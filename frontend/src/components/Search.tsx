import React, { useState } from 'react';
import { searchTracks, importTrack } from '@/lib/api';
import { Loader2, Search as SearchIcon } from 'lucide-react';

interface SearchProps {
    onTrackSelect: (track: any) => void;
}

export const Search: React.FC<SearchProps> = ({ onTrackSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await searchTracks(query);
            setResults(res);
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-50 w-96 max-h-[80vh] flex flex-col">
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search song..."
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
                />
                <button type="submit" disabled={loading} className="p-2 bg-yellow-500 rounded-lg text-slate-900 font-bold hover:bg-yellow-400">
                    {loading ? <Loader2 className="animate-spin" /> : <SearchIcon />}
                </button>
            </form>

            {results.length > 0 && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-y-auto shadow-xl">
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
                            onClick={() => handleSelect(r.id)}
                        >
                            <div className="font-bold text-sm truncate">{r.trackName}</div>
                            <div className="text-xs text-slate-400 truncate">{r.artistName}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
