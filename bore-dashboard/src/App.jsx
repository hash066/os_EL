import React, { useState, useEffect, useRef } from 'react';
import { Activity, Gauge, Cpu, Zap, Info, Play, Square, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Mandelbrot = ({ isStressing, boreEnabled }) => {
    const canvasRef = useRef(null);
    const lagCounter = useRef(0);
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            // EXTREME STUTTER LOGIC
            if (isStressing && !boreEnabled) {
                lagCounter.current++;
                // Create 12-frame "freezes" every 30 frames
                if (lagCounter.current % 30 < 12) {
                    setIsGlitching(true);
                    animationFrameId = requestAnimationFrame(render);
                    return;
                }
            }
            setIsGlitching(false);

            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;
            const zoom = 1 + Math.sin(Date.now() / 1200) * 0.2;

            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let zx = 1.5 * (x - width / 2) / (0.55 * zoom * width);
                    let zy = (y - height / 2) / (0.55 * zoom * height);
                    let i = 45;
                    while (zx * zx + zy * zy < 4 && i > 0) {
                        let tmp = zx * zx - zy * zy + -0.745;
                        zy = 2.0 * zx * zy + 0.1;
                        zx = tmp;
                        i--;
                    }
                    const pix = (x + y * width) * 4;

                    // GLITCH EFFECT (Visual Noise)
                    const glitch = (isStressing && !boreEnabled && Math.random() > 0.85);
                    data[pix] = glitch ? 255 : i * 22;
                    data[pix + 1] = glitch ? 0 : i * 8;
                    data[pix + 2] = glitch ? 255 : i * 45;
                    data[pix + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isStressing, boreEnabled]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={400}
                height={300}
                className="w-full h-full object-cover"
            />
            {isGlitching && (
                <div className="absolute inset-0 bg-red-500/10 pointer-events-none flex items-center justify-center">
                    <div className="bg-red-600 text-white px-6 py-2 font-black text-lg uppercase animate-ping">LAG DETECTED</div>
                </div>
            )}
        </div>
    );
};

const FPSMonitor = () => {
    const [fps, setFps] = useState(60);
    const lastTime = useRef(performance.now());
    const frames = useRef(0);

    useEffect(() => {
        const update = () => {
            const now = performance.now();
            frames.current++;
            if (now > lastTime.current + 1000) {
                setFps(Math.round((frames.current * 1000) / (now - lastTime.current)));
                lastTime.current = now;
                frames.current = 0;
            }
            requestAnimationFrame(update);
        };
        update();
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Activity size={14} className={fps < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'} />
            <span className="text-xs font-mono font-bold">{fps} FPS</span>
        </div>
    );
};

function App() {
    const [isStressing, setIsStressing] = useState(false);
    const [boreEnabled, setBoreEnabled] = useState(false);

    const toggleStress = async () => {
        const newState = !isStressing;
        setIsStressing(newState);

        try {
            await fetch('http://localhost:3001/api/stress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: newState,
                    mode: boreEnabled ? 'bore' : 'normal'
                })
            });
        } catch (e) {
            console.error('Backend offline');
        }
    };

    const toggleBore = async () => {
        const newState = !boreEnabled;
        setBoreEnabled(newState);
        if (isStressing) {
            await fetch('http://localhost:3001/api/stress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: true,
                    mode: newState ? 'bore' : 'normal'
                })
            });
        }
    };

    return (
        <div className="min-h-screen bg-bore-bg text-white p-8 overflow-hidden font-sans">
            {/* Background Glow */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-60">
                <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-bore-primary/10 blur-[130px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-bore-secondary/10 blur-[130px] rounded-full animate-pulse-slow"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter mb-1">
                            <span className="text-gradient">BORE</span> DASHBOARD
                        </h1>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Scientific Visualization Engine v2.0</p>
                    </div>
                    <FPSMonitor />
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Visualizer */}
                    <div className="lg:col-span-2 relative aspect-[16/10] glass rounded-[3rem] overflow-hidden border border-white/10 group shadow-2xl">
                        <Mandelbrot isStressing={isStressing} boreEnabled={boreEnabled} />

                        {/* BIG STATUS OVERLAY */}
                        <AnimatePresence>
                            {isStressing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                                >
                                    <div className={`text-6xl md:text-8xl font-black uppercase tracking-tighter text-center line-height-[0.8] ${boreEnabled ? 'text-bore-primary/50' : 'text-red-500/70'}`}>
                                        BORE <br /> {boreEnabled ? 'ACTIVE' : 'DISABLED'}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                <Zap size={16} className="text-bore-primary" />
                                <span className="text-xs font-black uppercase tracking-widest">Interactive Workload</span>
                            </div>
                            {isStressing && !boreEnabled && (
                                <motion.div
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity }}
                                    className="bg-red-500/20 text-red-500 text-[10px] font-black px-4 py-1.5 rounded-full border border-red-500/30 uppercase"
                                >
                                    Critical Scheduler Congestion
                                </motion.div>
                            )}
                        </div>

                        <div className="absolute bottom-8 left-8 right-8 z-20 flex justify-between items-end">
                            <div className="glass px-6 py-3 rounded-2xl border border-white/10 max-w-xs">
                                <h3 className="text-lg font-black mb-1 flex items-center gap-2">
                                    {boreEnabled ? <Info className="text-bore-primary" size={18} /> : <Activity className="text-red-500" size={18} />}
                                    System Logic
                                </h3>
                                <p className="text-[10px] text-white/50 leading-tight">
                                    {boreEnabled
                                        ? "BORE identify this UI rendering as a 'low burst' task and ensures sub-5ms latency."
                                        : "Standard Fairness Model: UI thread is competing with heavy background loads equally."}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-12 h-12 glass rounded-xl border border-white/10 flex items-center justify-center font-mono font-black text-bore-primary">
                                    {boreEnabled ? '60' : (isStressing ? '14' : '60')}
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10 pointer-events-none" />
                    </div>

                    {/* Control Panel */}
                    <div className="space-y-6">
                        <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
                            <h2 className="flex items-center gap-3 text-xl font-black mb-8">
                                <Settings2 className="text-bore-secondary" /> CORE CONTROL
                            </h2>

                            <div className="space-y-6">
                                <button
                                    onClick={toggleStress}
                                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 font-black text-lg transition-all active:scale-95 ${isStressing
                                        ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                                        : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                >
                                    {isStressing ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                                    {isStressing ? 'HALT STRESS' : 'TRIGGER LOAD'}
                                </button>

                                <button
                                    onClick={toggleBore}
                                    className={`w-full py-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-2 ${boreEnabled
                                            ? 'bg-bore-primary/20 border-bore-primary text-bore-primary shadow-[0_0_30px_rgba(0,242,255,0.2)]'
                                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Architecture</span>
                                    <span className="text-xl font-black uppercase tracking-tighter">
                                        {boreEnabled ? 'BORE ACTIVATED' : 'BORE DEACTIVATED'}
                                    </span>
                                    <div className={`mt-2 w-12 h-1 rounded-full ${boreEnabled ? 'bg-bore-primary animate-pulse' : 'bg-white/10'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="glass p-6 rounded-[2rem] border border-bore-primary/20">
                            <div className="flex justify-between mb-2">
                                <span className="text-[9px] font-black text-white/40 uppercase">CPU Resource Bias</span>
                                <span className="text-[9px] font-black text-bore-primary uppercase">v6.12.5 Stable</span>
                            </div>
                            <div className="h-6 w-full bg-white/5 rounded-xl p-1 overflow-hidden">
                                <motion.div
                                    animate={{ width: isStressing ? (boreEnabled ? '12%' : '85%') : '5%' }}
                                    className={`h-full rounded-lg ${boreEnabled ? 'bg-bore-primary' : (isStressing ? 'bg-red-500' : 'bg-bore-primary')}`}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
                                <span>Idle</span>
                                <span>Stress Limit</span>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-12 flex justify-center items-center gap-12 text-white/10">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-r border-white/5 pr-12 h-4">
                        <Cpu size={14} /> Ubuntu 24.04 LTS
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Activity size={14} /> EEVDF Compliant
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;
