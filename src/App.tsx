import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Compass, Maximize2 } from 'lucide-react';

export default function App() {
  const [power, setPower] = useState<number>(50);
  const [angle, setAngle] = useState<number>(45);
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [distance, setDistance] = useState<number>(0);
  const [bestRecord, setBestRecord] = useState<number>(0);
  
  const [animationKeyframes, setAnimationKeyframes] = useState<{left: string[], bottom: string[]}>({
    left: ['0%', '0%'],
    bottom: ['0%', '0%']
  });
  
  // Physics Constants
  const G = 9.8;
  // Maximum possible distance (power=100, angle=45) => 100^2 / 9.8 = ~1020m.
  // We set canvas width max to 1050 to comfortably fit it.
  const MAX_X = 1050; 
  // Maximum possible height (power=100, angle=90) => 100^2 / (2*9.8) = ~510m.
  const MAX_Y = 550;

  // Calculate current trajectory for the dotted line preview
  const currentPhysics = useMemo(() => {
    const vx = power * Math.cos((angle * Math.PI) / 180);
    const vy = power * Math.sin((angle * Math.PI) / 180);
    const tFlight = (2 * vy) / G;
    const d = vx * tFlight;

    let path = "";
    const steps = 20;
    if (tFlight > 0) {
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tFlight;
        const x = vx * t;
        const y = vy * t - 0.5 * G * t * t;
        // SVG y=0 is at top, so we invert Y coordinate explicitly here
        path += `${(x / MAX_X) * 100},${100 - (y / MAX_Y) * 100} `;
      }
    }
    return { distance: Math.max(0, d), flightTime: tFlight || 0, svgPath: path };
  }, [power, angle]);

  const handleThrow = () => {
    if (isFlying) return;

    const vx = power * Math.cos((angle * Math.PI) / 180);
    const vy = power * Math.sin((angle * Math.PI) / 180);
    const tFlight = (2 * vy) / G;
    const targetDistance = vx * tFlight;

    const steps = 30;
    const leftArr: string[] = [];
    const bottomArr: string[] = [];

    if (tFlight > 0) {
      for(let i=0; i<=steps; i++) {
        const t = (i/steps)*tFlight;
        const currentX = vx * t;
        const currentY = Math.max(0, vy * t - 0.5 * G * Math.pow(t, 2));

        leftArr.push(`${(currentX / MAX_X) * 100}%`);
        bottomArr.push(`${(currentY / MAX_Y) * 100}%`);
      }
      // Ensure it lands cleanly on 0% bottom
      leftArr[leftArr.length - 1] = `${(targetDistance / MAX_X) * 100}%`;
      bottomArr[bottomArr.length - 1] = '0%';
    } else {
      leftArr.push('0%', '0%');
      bottomArr.push('0%', '0%');
    }

    setAnimationKeyframes({ left: leftArr, bottom: bottomArr });
    setIsFlying(true);
  };

  // Distance markers for background
  const markers = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  // Visual animation duration (scaled down so it doesn't take 14 realtime seconds)
  const animDuration = Math.max(currentPhysics.flightTime * 0.25, 0.5);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center z-20 shadow-md relative">
          <h1 className="text-2xl font-bold tracking-tight">돌던지기 게임</h1>
          <div className="flex gap-4">
            <div className="flex px-3 py-1 bg-white/20 rounded-full items-center gap-2">
              <span className="text-sm">비거리:</span>
              <span className="font-mono font-bold text-lg">{distance.toFixed(1)}m</span>
            </div>
            <div className="flex px-3 py-1 bg-amber-500/90 rounded-full items-center gap-2">
              <Trophy size={16} />
              <span className="font-mono font-bold">{bestRecord.toFixed(1)}m</span>
            </div>
          </div>
        </div>

        {/* Game Canvas Box */}
        <div className="relative w-full h-72 md:h-96 bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden">
          
          {/* Distance Grids */}
          <div className="absolute inset-0 pointer-events-none">
            {markers.map((m) => (
              <div 
                key={m}
                className="absolute top-0 bottom-0 border-l border-white/30 border-dashed flex flex-col justify-end pb-2"
                style={{ left: `${(m / MAX_X) * 100}%` }}
              >
                <span className="text-white align-bottom select-none text-xs ml-1 font-mono font-medium drop-shadow-md">
                  {m}m
                </span>
              </div>
            ))}
          </div>

          {/* Dotted Trajectory Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {!isFlying && (
               <polyline 
                 points={currentPhysics.svgPath} 
                 fill="none" 
                 stroke="rgba(255,255,255,0.7)" 
                 strokeWidth="0.5" 
                 strokeDasharray="1,1" 
                 className="drop-shadow-sm"
               />
            )}
          </svg>

          {/* Player/Starting Base */}
          <div className="absolute left-0 bottom-0 w-12 h-6 bg-slate-700/20 rounded-t-full -translate-x-1/2"></div>

          {/* The Rock */}
          <motion.div
            className="absolute z-20 flex items-center justify-center drop-shadow-lg"
            style={{ 
              width: '32px', 
              height: '32px',
              // Visual correction to center the rock coordinate nicely
              x: '-50%', 
              y: '50%' 
            }}
            initial={{ left: '0%', bottom: '0%' }}
            animate={
              isFlying
                ? {
                    left: animationKeyframes.left,
                    bottom: animationKeyframes.bottom,
                    rotate: [0, 720]
                  }
                : { left: '0%', bottom: '0%', rotate: 0 }
            }
            transition={{ duration: animDuration, ease: "linear" }}
            onAnimationComplete={() => {
              if (isFlying) {
                setIsFlying(false);
                setDistance(currentPhysics.distance);
                setBestRecord(prev => Math.max(prev, currentPhysics.distance));
              }
            }}
          >
            <span className="text-3xl select-none relative -top-1">🪨</span>
          </motion.div>
        </div>

        {/* Ground */}
        <div className="h-6 w-full bg-emerald-600 border-t-4 border-emerald-700 shadow-[inset_0_4px_6px_rgba(0,0,0,0.1)] z-10 relative"></div>

        {/* Controls Panel */}
        <div className="p-6 md:p-8 bg-slate-50 flex flex-col md:flex-row gap-8 items-center border-t border-slate-200">
          
          <div className="flex-1 w-full space-y-6">
            {/* Power Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <label className="font-semibold flex items-center gap-2">
                  <Maximize2 size={16} className="text-indigo-500"/> 파워 (Power)
                </label>
                <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{power} m/s</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={power} 
                onChange={(e) => setPower(parseInt(e.target.value))}
                disabled={isFlying}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
              />
            </div>

            {/* Angle Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <label className="font-semibold flex items-center gap-2">
                  <Compass size={16} className="text-indigo-500" /> 각도 (Angle)
                </label>
                <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{angle}°</span>
              </div>
              <input 
                type="range" 
                min="0" max="90" 
                value={angle} 
                onChange={(e) => setAngle(parseInt(e.target.value))}
                disabled={isFlying}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleThrow}
            disabled={isFlying}
            className={`
              w-full md:w-48 h-16 rounded-xl font-bold text-xl text-white shadow-lg
              transition-all duration-200 flex items-center justify-center gap-2
              ${isFlying 
                ? 'bg-slate-400 cursor-not-allowed scale-95' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 hover:shadow-indigo-500/25'}
            `}
          >
            {isFlying ? '날아가는 중...' : '던지기!'} 
          </button>
        </div>

      </div>
    </div>
  );
}
