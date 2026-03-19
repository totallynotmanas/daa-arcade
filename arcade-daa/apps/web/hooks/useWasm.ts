"use client";
import { useEffect, useState } from "react";

export function useWasm() {
  const [isReady, setIsReady] = useState(false);
  const [engine, setEngine] = useState<any>(null);

  useEffect(() => {
    // Dynamically import the Emscripten glue code
    import("../public/wasm/bridges.js").then(async (module) => {
      // Initialize the WASM module
      const initWasm = module.default;
      
      const instance = await initWasm({
        // Tell the JS file where to find the .wasm binary
        locateFile: (path: string) => `/wasm/${path}`,
      });

      setEngine(instance);
      setIsReady(true);
      console.log("WASM Engine Booted! 🚀", instance);
    });
  }, []);

  return { isReady, engine };
}