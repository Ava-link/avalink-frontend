'use client';

import React from "react";
import { Orbitron } from "next/font/google";
import { cn } from "@/lib/utils";
import { useWallet } from "@/app/providers/WalletProvider";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400","700"] });

export default function Landing() {
  const { darkMode } = useWallet();

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
