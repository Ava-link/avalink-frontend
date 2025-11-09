"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import { IconSquareRoundedX } from "@tabler/icons-react";

const CheckIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
};

const CheckFilled = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-6 h-6 ", className)}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

type LoadingState = {
  text: string;
};

const LoaderCore = ({
  loadingStates,
  value = 0,
  themeMode = "dark",
}: {
  loadingStates: LoadingState[];
  value?: number;
  themeMode?: "light" | "dark";
}) => {
  const activeTextClass =
    themeMode === "dark" ? "text-lime-400" : "text-lime-600";
  const neutralTextClass =
    themeMode === "dark" ? "text-gray-400" : "text-gray-500";
  const upcomingTextClass =
    themeMode === "dark" ? "text-gray-500" : "text-gray-400";
  const completedIconClass =
    themeMode === "dark" ? "text-gray-500" : "text-gray-400";
  const upcomingIconClass =
    themeMode === "dark" ? "text-gray-600" : "text-gray-300";

  return (
    <div className="flex relative justify-start max-w-xl mx-auto flex-col mt-4">
      {loadingStates.map((loadingState, index) => {
        const distance = Math.abs(index - value);
        const opacity = Math.max(1 - distance * 0.2, 0); // Minimum opacity is 0, keep it 0.2 if you're sane.

        return (
          <motion.div
            key={index}
            className={cn("text-left flex gap-2 mb-4")}
            initial={{ opacity: 0 }}
            animate={{ opacity, scale: value === index ? 1 : 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div>
              {index > value && (
                <CheckIcon className={cn(upcomingIconClass)} />
              )}
              {index <= value && (
                <CheckFilled
                  className={cn(
                    index === value ? activeTextClass : completedIconClass,
                    index === value && "opacity-100"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                index === value
                  ? `${activeTextClass} opacity-100`
                  : index < value
                  ? neutralTextClass
                  : upcomingTextClass
              )}
            >
              {loadingState.text}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
  manualStepIndex,
  onClose,
  variant = "fullscreen",
  className,
  themeMode = "dark",
}: {
  loadingStates: LoadingState[];
  loading?: boolean;
  duration?: number;
  loop?: boolean;
  manualStepIndex?: number;
  onClose?: () => void;
  variant?: "fullscreen" | "inline" | "floating";
  className?: string;
  themeMode?: "light" | "dark";
}) => {
  const [currentState, setCurrentState] = useState(0);
  const isManual = typeof manualStepIndex === "number";

  useEffect(() => {
    if (!loading) {
      setCurrentState(0);
      return;
    }
    if (isManual) {
      setCurrentState(
        Math.max(
          0,
          Math.min(manualStepIndex ?? 0, Math.max(loadingStates.length - 1, 0))
        )
      );
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentState((prevState) =>
        loop
          ? prevState === loadingStates.length - 1
            ? 0
            : prevState + 1
          : Math.min(prevState + 1, loadingStates.length - 1)
      );
    }, duration);

    return () => clearTimeout(timeout);
  }, [
    currentState,
    duration,
    isManual,
    loading,
    loadingStates.length,
    loop,
    manualStepIndex,
  ]);

  useEffect(() => {
    if (!loading && !isManual) {
      setCurrentState(0);
    }
  }, [isManual, loading]);


  if (variant === "inline") {
    return (
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={cn("w-full", className)}
          >
            <LoaderCore
              value={currentState}
              loadingStates={loadingStates}
              themeMode={themeMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === "floating") {
    return (
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn("fixed bottom-6 right-6 z-[110] w-full max-w-sm", className)}
          >
            <LoaderCore
              value={currentState}
              loadingStates={loadingStates}
              themeMode={themeMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className={className}
        >
          <LoaderCore
            value={currentState}
            loadingStates={loadingStates}
            themeMode={themeMode}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
