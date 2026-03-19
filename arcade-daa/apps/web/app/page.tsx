import BridgesGame from "../components/BridgesGame";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      {/* Optional: A subtle background grid for that "blueprint/algorithm" feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-8">
        <header className="text-center">
          <h1 className="text-5xl font-mono font-bold text-cyan-400 tracking-tighter mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            ALGO // ARCADE
          </h1>
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">
            Optimal DAA Visualizer v1.0
          </p>
        </header>

        {/* Your WASM Game Component */}
        <BridgesGame />

      </div>
    </main>
  );
}