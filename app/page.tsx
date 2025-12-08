'use client';

import React from "react";
import { Orbitron } from "next/font/google";
import { cn } from "@/lib/utils";
import { useWallet } from "@/app/providers/WalletProvider";
import { WrenchIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400","700"] });

export default function Landing() {
  const { darkMode } = useWallet();
  const router = useRouter();

  return (
    <main
      className={cn(
        "min-h-screen w-full p-2 md:p-4",
        orbitron.className,
        darkMode ? "bg-[#0E0E0E] text-white" : "bg-[#f2f2f2] text-black"
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">

        {/* NAME BLOCK */}
        <section
          className={cn(
            "col-span-1 sm:col-span-2 lg:col-span-2 border p-6 flex items-center justify-center text-5xl sm:text-6xl font-bold tracking-wide h-40 sm:h-56 lg:h-64",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          AVALINK
        </section>

        <section
          className={cn(
            "col-span-1 sm:col-span-2 lg:col-span-2 border p-6 flex items-center justify-center text-xl sm:text-2xl font-bold tracking-wide h-40 sm:h-56 lg:h-64",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          The Interoperability Solution
        </section>

        {/* TEXT BLOCK */}
        <section
          className={cn(
            "border p-6 text-xs tracking-widest leading-relaxed flex items-center h-40 sm:h-56 lg:h-64",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <p>
          SIMPLIFYING CROSS-CHAIN INTEROPERABILITY ON AVALANCHE
          </p>
        </section>

        {/* BLOCK WITH SLANTED LINES */}
        <section
          className={cn(
            "border p-6 text-sm tracking-widest sm:h-auto lg:h-auto overflow-hidden",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <h2 className="font-bold mb-3">FEATURES<br/></h2>
          -- TEST OUT THE BRIDGE WITH OUR FAUCET<br/>
          
          
          <div 
            onClick={() => router.push('/faucet')}
            className={cn(
              "cursor-target border p-4 text-sm tracking-widest mt-4 relative overflow-hidden",
              darkMode ? "border-gray-700 hover:bg-gray-800/50" : "border-black hover:bg-gray-200/50"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 animate-grid-right-to-left bg-[length:20px_20px]",
                darkMode
                  ? "bg-[repeating-linear-gradient(135deg,#0E0E0E_0_10px,#1a1a1a_10px_20px)]"
                  : "bg-[repeating-linear-gradient(135deg,#e0e0e0_0_10px,#f2f2f2_10px_20px)]"
              )}
            ></div>
            <div className="relative z-10">
              <WrenchIcon className="w-4 h-4 inline-block mr-2" />
              FAUCET
            </div>
          </div>

          <div className="text-red-500 mt-4">
            ●●●●●●●●<br/><br/>
          </div>
        </section>


        {/* PORTFOLIO SPECS */}
        <section
          className={cn(
            "border p-6 text-sm tracking-widest h-40 sm:h-56 lg:h-64 overflow-hidden",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <h2 className="font-bold mb-3">FEATURES<br/></h2>
          -- MULTI-CHAIN SUPPORT<br/>
          -- HIGH THROUGHPUT<br/>
          -- INSTANT BRIDGING<br/>
          -- INSTANT DEPLOYMENT<br/>
          <div className="text-red-500">
            ●●●●●●●●<br/><br/>
          </div>
          <div className="text-[10px]">INSTANT BRIDGING</div>
        </section>

        <section
          className={cn(
            "border p-6 text-sm tracking-widest h-auto sm:h-56 lg:h-64 overflow-hidden",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <h2 className="font-bold mb-3">ECOSYSTEMS</h2>
          -- Ecosystems is a next-generation interoperability protocol layer built for the Avalanche, enabling seamless and scalable token movement between Avalanche L1s<br/>
          <div className="text-red-500">
            ●●●●●●●●<br/><br/>
          </div>
          <div className="text-[10px]">In development</div>
        </section>

        {/* BIG PATTERN BLOCK */}
        <section
          className={cn(
            "col-span-1 sm:col-span-2 lg:col-span-4 border p-6 relative overflow-hidden h-48 sm:h-64 lg:h-72",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 animate-stripes-left-to-right",
              darkMode
                ? "bg-[repeating-linear-gradient(135deg,#0E0E0E_0px,#0E0E0E_12px,#1a1a1a_12px,#1a1a1a_24px)]"
                : "bg-[repeating-linear-gradient(135deg,#e0e0e0_0px,#e0e0e0_12px,#f2f2f2_12px,#f2f2f2_24px)]"
            )}
          />
        </section>

      </div>
    </main>
  );
}
