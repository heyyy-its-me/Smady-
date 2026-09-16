import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  disabled?: boolean;
}

export function TimePickerInput({ value, onChange, disabled }: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map(Number);
      setHours(h || 0);
      setMinutes(m || 0);
    }
  }, [value]);

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

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none cursor-pointer flex items-center justify-between ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span>{value || "--:--"}</span>
        <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-border rounded-lg shadow-lg p-4 z-50 w-48">
          {/* Hour Selector */}
          <div className="flex flex-col items-center mb-4">
            <label className="text-xs font-semibold text-muted mb-2">Hours</label>
            <div className="flex items-center gap-2">
              <button
                onClick={decrementHours}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="bg-primary-50 border-2 border-primary-500 rounded-lg px-4 py-2 w-16 text-center font-bold text-lg">
                {String(hours).padStart(2, "0")}
              </div>
              <button
                onClick={incrementHours}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Minute Selector */}
          <div className="flex flex-col items-center mb-4">
            <label className="text-xs font-semibold text-muted mb-2">Minutes</label>
            <div className="flex items-center gap-2">
              <button
                onClick={decrementMinutes}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="bg-primary-50 border-2 border-primary-500 rounded-lg px-4 py-2 w-16 text-center font-bold text-lg">
                {String(minutes).padStart(2, "0")}
              </div>
              <button
                onClick={incrementMinutes}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="border-t pt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                updateTime(9, 0);
                setIsOpen(false);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              9:00 AM
            </button>
            <button
              onClick={() => {
                updateTime(14, 0);
                setIsOpen(false);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              2:00 PM
            </button>
            <button
              onClick={() => {
                updateTime(18, 0);
                setIsOpen(false);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              6:00 PM
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-3 bg-primary-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
