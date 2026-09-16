import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Clock } from "lucide-react";

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  disabled?: boolean;
}

export function TimePickerInput({ value, onChange, disabled }: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(":").map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const updateTime = (h: number, m: number) => {
    const newH = Math.max(0, Math.min(23, h));
    const newM = Math.max(0, Math.min(59, m));
    setHours(newH);
    setMinutes(newM);
    onChange(`${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
  };

  const incrementHours = () => updateTime(hours + 1, minutes);
  const decrementHours = () => updateTime(hours - 1, minutes);
  const incrementMinutes = () => updateTime(hours, minutes + 5);
  const decrementMinutes = () => updateTime(hours, minutes - 5);

  const setQuickTime = (h: number, m: number) => {
    updateTime(h, m);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none cursor-pointer flex items-center justify-between transition-colors hover:bg-opacity-50 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className="font-medium">{value || "Select time"}</span>
        <Clock className="h-4 w-4 text-primary-500" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-2xl p-4 z-[9999] w-64">
          {/* Hour and Minute Selectors */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Hour Selector */}
            <div className="flex flex-col items-center">
              <label className="text-xs font-semibold text-muted mb-2 uppercase">Hour</label>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={incrementHours}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div className="bg-primary-100 border-2 border-primary-500 rounded-lg px-4 py-2 w-16 text-center font-bold text-xl">
                  {String(hours).padStart(2, "0")}
                </div>
                <button
                  type="button"
                  onClick={decrementHours}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Minute Selector */}
            <div className="flex flex-col items-center">
              <label className="text-xs font-semibold text-muted mb-2 uppercase">Minute</label>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={incrementMinutes}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div className="bg-primary-100 border-2 border-primary-500 rounded-lg px-4 py-2 w-16 text-center font-bold text-xl">
                  {String(minutes).padStart(2, "0")}
                </div>
                <button
                  type="button"
                  onClick={decrementMinutes}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="border-t pt-3 grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setQuickTime(9, 0)}
              className="text-xs bg-gray-100 hover:bg-primary-100 px-2 py-1.5 rounded font-medium transition-colors"
            >
              9:00 AM
            </button>
            <button
              type="button"
              onClick={() => setQuickTime(14, 0)}
              className="text-xs bg-gray-100 hover:bg-primary-100 px-2 py-1.5 rounded font-medium transition-colors"
            >
              2:00 PM
            </button>
            <button
              type="button"
              onClick={() => setQuickTime(18, 0)}
              className="text-xs bg-gray-100 hover:bg-primary-100 px-2 py-1.5 rounded font-medium transition-colors"
            >
              6:00 PM
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full bg-primary-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
