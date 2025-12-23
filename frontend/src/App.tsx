import { useState } from 'react';
import { Player } from '@/components/Player';
import { Search } from '@/components/Search';
import { Library } from '@/components/Library';
import { Loader2 } from 'lucide-react';

function App() {
    const [currentTrack, setCurrentTrack] = useState(null);

    return (
        <div className="bg-slate-950 min-h-screen text-white overflow-hidden relative pr-80">
            <Search onTrackSelect={setCurrentTrack} />
            <Library />

            {!currentTrack ? (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            English With Songs
                        </h1>
                        <p className="text-slate-400">Search for a song to begin learning</p>
                    </div>
                </div>
            ) : (
                <Player track={currentTrack} />
            )}
        </div>
    );
}

export default App;
