import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from './components/Player';
import { Search } from './components/Search';
import { Library } from './components/Library';
import { Music2, Sparkles } from 'lucide-react';

function App() {
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleWordAdded = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex h-screen bg-[var(--vanta-bg)] text-white overflow-hidden font-sans">
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <header className="h-16 px-6 flex items-center justify-between border-b border-[var(--vanta-border)] bg-[var(--vanta-surface)]/50 backdrop-blur-md z-30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
                            <Music2 size={20} className="text-white" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight">
                            EWG <span className="text-[var(--text-muted)] font-medium">Pro</span>
                        </h1>
                    </div>

                    <div className="flex-1 max-w-xl px-8">
                        <Search onTrackSelect={setCurrentTrack} />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--vanta-surface-bright)] rounded-full border border-[var(--vanta-border)] text-xs font-medium text-[var(--vanta-accent-blue)]">
                            <Sparkles size={14} />
                            <span>AI Ready</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!currentTrack ? (
                            <motion.div
                                key="hero"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="h-full flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="space-y-6 max-w-2xl">
                                    <h2 className="text-5xl font-black bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent leading-tight">
                                        Learn English through the lens of music
                                    </h2>
                                    <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                                        Analyze lyrics, master grammar with AI, and grow your vocabulary with a world-class SRS system.
                                    </p>
                                    <div className="pt-4 flex justify-center gap-4">
                                        <div className="px-6 py-3 bg-[var(--vanta-surface-bright)] border border-[var(--vanta-border)] rounded-2xl text-sm text-[var(--text-secondary)]">
                                            Search for your favorite artist above to start
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="player"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <Player track={currentTrack} onWordAdded={handleWordAdded} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Integrated Library Sidebar */}
            <aside className="w-80 border-l border-[var(--vanta-border)] bg-[var(--vanta-surface)] flex flex-col z-40">
                <Library refreshTrigger={refreshTrigger} />
            </aside>
        </div>
    );
}

export default App;
