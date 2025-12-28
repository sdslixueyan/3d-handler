
import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import { HandData } from './types';
import { Loader2, Camera, Hand, HelpCircle, Palette, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [planetColor, setPlanetColor] = useState('#ff7700');
  const [ringColor, setRingColor] = useState('#ffffff');
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // @ts-ignore
    const hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: any) => {
      setIsLoading(false);
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const middleBase = landmarks[9];

        // 1. Open Hand Check
        const isOpen = (
          indexTip.y < landmarks[6].y &&
          middleTip.y < landmarks[10].y &&
          ringTip.y < landmarks[14].y &&
          pinkyTip.y < landmarks[18].y
        );

        // 2. Fist Check (More lenient distance threshold)
        const isFist = !isOpen && (
          Math.abs(indexTip.y - landmarks[5].y) < 0.12 &&
          Math.abs(middleTip.y - landmarks[9].y) < 0.12 &&
          Math.abs(ringTip.y - landmarks[13].y) < 0.12
        );

        // 3. Rotation
        const dxRoll = landmarks[17].x - landmarks[5].x;
        const dyRoll = landmarks[17].y - landmarks[5].y;
        const rotation = Math.atan2(dyRoll, dxRoll);

        // 4. Robust Depth (Hand Scale)
        const dxScale = wrist.x - middleBase.x;
        const dyScale = wrist.y - middleBase.y;
        const depth = Math.sqrt(dxScale * dxScale + dyScale * dyScale);

        setHandData({ isFist, isOpen, rotation, depth, x: wrist.x, y: wrist.y, landmarks });
      } else {
        setHandData(null);
      }
    });

    if (videoRef.current) {
      // @ts-ignore
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => { await hands.send({ image: videoRef.current! }); },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => { hands.close(); };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#010103] overflow-hidden font-sans text-white">
      <div className="absolute inset-0 z-0">
        <Scene handData={handData} planetColor={planetColor} ringColor={ringColor} />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
        <header className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="font-bold text-xl">Ω</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-white to-orange-200 uppercase">
                Void Voyager
              </h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Infinite Horizon v2.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isLoading && (
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Warping...</span>
              </div>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all active:scale-95"
            >
              <Settings2 className="w-5 h-5 text-orange-400" />
            </button>
          </div>
        </header>

        <div className="flex justify-between items-end pointer-events-none">
          <div className="flex flex-col gap-4 max-w-xs pointer-events-auto">
            {showSettings && (
              <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Core Config
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-bold">Planet Core</label>
                    <input type="color" value={planetColor} onChange={(e) => setPlanetColor(e.target.value)} className="w-10 h-6 rounded cursor-pointer bg-transparent border-none" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-bold">Spectral Rings</label>
                    <input type="color" value={ringColor} onChange={(e) => setRingColor(e.target.value)} className="w-10 h-6 rounded cursor-pointer bg-transparent border-none" />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl">
              <h2 className="text-orange-400 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Hand className="w-4 h-4" /> Neural Controls
              </h2>
              <ul className="space-y-3 text-[11px] font-medium text-white/70">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[9px]">1</div>
                  <span><b className="text-white uppercase">Roll Hand</b> &rarr; Orbit Orbit</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[9px]">2</div>
                  <span><b className="text-white uppercase">Fist + Pull</b> &rarr; Accel. Zoom Out</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[9px]">3</div>
                  <span><b className="text-white uppercase">Open + Push</b> &rarr; Decel. Zoom In</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-black/80 rounded-2xl border border-white/10 overflow-hidden w-40 h-30 relative self-start opacity-60 hover:opacity-100 transition-opacity">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover grayscale mirror" style={{ transform: 'scaleX(-1)' }} autoPlay muted playsInline />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${handData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[8px] text-white/50 uppercase font-black">Tracking</span>
              </div>
            </div>
          </div>
          
          <div className="text-right pointer-events-none hidden md:block">
            <div className="text-[60px] font-black leading-none opacity-10 select-none tracking-tighter uppercase italic">Infinite</div>
            <div className="text-[40px] font-black leading-none opacity-5 select-none tracking-tighter uppercase mb-4">Universe</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
