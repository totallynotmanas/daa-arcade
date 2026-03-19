"use client";
import { useEffect, useRef, useState } from "react";
import { useWasm } from "../hooks/useWasm";

type Island = { col: number; row: number; value: number };
// A Bridge connects two islands. count is 1 (single) or 2 (double)
type Bridge = { from: Island; to: Island; count: number };

export default function BridgesGame() {
  const { isReady, engine } = useWasm();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gridDimensions, setGridDimensions] = useState({ w: 7, h: 7 });
  const [islands, setIslands] = useState<Island[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);

  // --- INTERACTION STATE ---
  const [dragStart, setDragStart] = useState<Island | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Constants for rendering and hit detection
  const PADDING = 50;
  const ISLAND_RADIUS = 18;

  // Helper to calculate exactly where an island is on the canvas
  const getIslandCoords = (col: number, row: number, canvasW: number, canvasH: number) => {
    const stepX = (canvasW - PADDING * 2) / (gridDimensions.w - 1);
    const stepY = (canvasH - PADDING * 2) / (gridDimensions.h - 1);
    return { x: PADDING + col * stepX, y: PADDING + row * stepY };
  };

  const parseLevelData = (rawString: string) => {
    const [dimString, gridData] = rawString.split(":");
    const [w, h] = dimString.split("x").map(Number);
    setGridDimensions({ w, h });

    const newIslands: Island[] = [];
    let currentIndex = 0;

    for (let i = 0; i < gridData.length; i++) {
      const char = gridData[i];
      if (/[1-8]/.test(char)) {
        newIslands.push({
          col: currentIndex % w,
          row: Math.floor(currentIndex / w),
          value: parseInt(char, 10),
        });
        currentIndex += 1; 
      } else if (/[a-z]/.test(char)) {
        currentIndex += char.charCodeAt(0) - "a".charCodeAt(0) + 1;
      }
    }
    setIslands(newIslands);
    setBridges([]); // Clear bridges on new level
  };

  // --- MOUSE HANDLERS ---
  const getMouseCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    const { x, y } = getMouseCanvasPos(e);

    // Hit detection: Did we click inside an island's radius?
    const clickedIsland = islands.find(island => {
      const pos = getIslandCoords(island.col, island.row, width, height);
      const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return dist <= ISLAND_RADIUS + 5; // +5 gives a generous hitbox
    });

    if (clickedIsland) {
      setDragStart(clickedIsland);
      setMousePos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart) {
      setMousePos(getMouseCanvasPos(e));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart || !canvasRef.current) {
      setDragStart(null);
      return;
    }

    const { width, height } = canvasRef.current;
    const { x, y } = getMouseCanvasPos(e);

    const targetIsland = islands.find(island => {
      const pos = getIslandCoords(island.col, island.row, width, height);
      const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return dist <= ISLAND_RADIUS + 5;
    });

    if (targetIsland && targetIsland !== dragStart) {
      const isHorizontal = dragStart.row === targetIsland.row;
      const isVertical = dragStart.col === targetIsland.col;

      if (isHorizontal || isVertical) {
        setBridges(prev => {
          const from = dragStart.col < targetIsland.col || dragStart.row < targetIsland.row ? dragStart : targetIsland;
          const to = from === dragStart ? targetIsland : dragStart;

          // Use exact coordinates to find the bridge instead of object references
          const existingIndex = prev.findIndex(b => 
            b.from.col === from.col && b.from.row === from.row && 
            b.to.col === to.col && b.to.row === to.row
          );
          
          if (existingIndex >= 0) {
            const currentCount = prev[existingIndex].count;
            if (currentCount === 1) {
              // ✨ THE FIX: Pure state update. Create a totally new object!
              return prev.map((b, i) => i === existingIndex ? { ...b, count: 2 } : b);
            } else {
              // ✨ THE FIX: Pure delete using filter.
              return prev.filter((_, i) => i !== existingIndex);
            }
          } else {
            return [...prev, { from, to, count: 1 }];
          }
        });
      }
    }
    setDragStart(null);
    setMousePos(null);
  };

  // --- RENDER LOOP ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, width: number, blur: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // 1. Draw Established Bridges
    bridges.forEach(bridge => {
      const p1 = getIslandCoords(bridge.from.col, bridge.from.row, canvas.width, canvas.height);
      const p2 = getIslandCoords(bridge.to.col, bridge.to.row, canvas.width, canvas.height);
      
      if (bridge.count === 1) {
        drawLine(p1.x, p1.y, p2.x, p2.y, "#ec4899", 3, 10);
      } else {
        // Offset double bridges slightly
        const isHoriz = p1.y === p2.y;
        const offset = 6;
        drawLine(p1.x + (isHoriz ? 0 : offset), p1.y + (isHoriz ? offset : 0), p2.x + (isHoriz ? 0 : offset), p2.y + (isHoriz ? offset : 0), "#ec4899", 3, 10);
        drawLine(p1.x - (isHoriz ? 0 : offset), p1.y - (isHoriz ? offset : 0), p2.x - (isHoriz ? 0 : offset), p2.y - (isHoriz ? offset : 0), "#ec4899", 3, 10);
      }
    });

    // 2. Draw Active Drag Preview (The "Tether")
    if (dragStart && mousePos) {
      const p1 = getIslandCoords(dragStart.col, dragStart.row, canvas.width, canvas.height);
      drawLine(p1.x, p1.y, mousePos.x, mousePos.y, "#06b6d4", 2, 5); // Cyan preview line
    }

    // 3. Draw Islands (On top of bridges)
    islands.forEach((island) => {
      const { x, y } = getIslandCoords(island.col, island.row, canvas.width, canvas.height);
      
      ctx.beginPath();
      ctx.arc(x, y, ISLAND_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.fill();

      // Determine if island has correct number of bridges (Optional UI polish)
      const currentConnections = bridges.reduce((sum, b) => {
        // Use coordinates to check connections safely
        if ((b.from.col === island.col && b.from.row === island.row) || 
            (b.to.col === island.col && b.to.row === island.row)) {
          return sum + b.count;
        }
        return sum;
      }, 0);
      
      const isSatisfied = currentConnections === island.value;
      const glowColor = isSatisfied ? "#22c55e" : "#06b6d4";

      ctx.lineWidth = 3;
      ctx.strokeStyle = glowColor;
      ctx.shadowBlur = isSatisfied ? 20 : 15;
      ctx.shadowColor = glowColor;
      ctx.stroke();

      ctx.shadowBlur = 5;
      ctx.fillStyle = isSatisfied ? "#bbf7d0" : "#e0f2fe";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(island.value.toString(), x, y);
      ctx.shadowBlur = 0;
    });

  }, [islands, bridges, dragStart, mousePos, gridDimensions]); 

  // ... (Keep your loading state return block exactly the same)
  if (!isReady) {
    return (
      <div className="flex h-[400px] w-full max-w-2xl items-center justify-center bg-[#050505] text-cyan-500 font-mono border border-cyan-900/50 rounded-xl">
        <p className="animate-pulse tracking-widest">BOOTING WASM ENGINE...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 bg-[#0a0a0a] rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] w-full max-w-2xl">
      <div className="flex justify-between w-full mb-4 px-2">
        <h2 className="text-xl font-mono text-cyan-400 tracking-widest font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
          BRIDGES // HASHIWOKAKERO
        </h2>
        <div className="text-pink-500 font-mono text-sm uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_#ec4899]"></span>
          PLAYER OVERRIDE ENGAGED
        </div>
      </div>
      
      <div className="relative w-full aspect-square max-w-[500px] bg-[#050505] border-2 border-gray-800 rounded-lg overflow-hidden crt-overlay">
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={500} 
          className="w-full h-full block cursor-crosshair active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Cancel drag if mouse leaves canvas
        />
        {islands.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-sm pointer-events-none">
            AWAITING LEVEL GENERATION...
          </div>
        )}
      </div>

      <button 
        className="mt-8 px-8 py-3 bg-cyan-950/30 text-cyan-400 border-2 border-cyan-500/50 rounded hover:bg-cyan-950/80 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-mono uppercase text-sm tracking-wider"
        onClick={() => {
            const randomSeed = Math.random().toString(36).substring(7);
            const rawLevelData = engine.ccall('generate_level', 'string', ['number', 'number', 'string'], [7, 7, randomSeed]);
            parseLevelData(rawLevelData);
        }}
      >
        Generate New Data [ {"->"} ]
      </button>
    </div>
  );
}