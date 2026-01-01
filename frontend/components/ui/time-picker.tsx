'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // Format: "HH:MM" (24-hour)
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function TimePicker({ value, onChange, className, required }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [isAM, setIsAM] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (h !== undefined && m !== undefined) {
        if (h >= 12) {
          setIsAM(false);
          setHour(h === 12 ? 12 : h - 12);
        } else {
          setIsAM(true);
          setHour(h === 0 ? 12 : h);
        }
        setMinute(m);
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleTimeChange = (newHour: number, newMinute: number, newIsAM: boolean) => {
    setHour(newHour);
    setMinute(newMinute);
    setIsAM(newIsAM);
    
    // Convert to 24-hour format
    let hour24 = newHour;
    if (!newIsAM && newHour !== 12) {
      hour24 = newHour + 12;
    } else if (newIsAM && newHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const displayValue = () => {
    const h = hour === 0 ? 12 : hour;
    const m = minute.toString().padStart(2, '0');
    const period = isAM ? 'AM' : 'PM';
    return `${h}:${m} ${period}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const incrementHour = () => {
    const newHour = hour === 12 ? 1 : hour + 1;
    handleTimeChange(newHour, minute, isAM);
  };

  const decrementHour = () => {
    const newHour = hour === 1 ? 12 : hour - 1;
    handleTimeChange(newHour, minute, isAM);
  };

  const incrementMinute = () => {
    const newMinute = minute === 59 ? 0 : minute + 1;
    handleTimeChange(hour, newMinute, isAM);
  };

  const decrementMinute = () => {
    const newMinute = minute === 0 ? 59 : minute - 1;
    handleTimeChange(hour, newMinute, isAM);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          "focus-visible:border-indigo-500 focus-visible:bg-white transition-all duration-200",
          "flex items-center justify-between",
          isOpen && "ring-2 ring-indigo-500 border-indigo-500"
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {value ? displayValue() : 'Select time'}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] bg-white rounded-lg border-2 border-slate-200 shadow-xl p-5">
          {/* Header Labels */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 text-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hour</label>
            </div>
            <div className="w-4"></div>
            <div className="w-20 text-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Minute</label>
            </div>
            <div className="w-4"></div>
            <div className="w-20 text-center">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Period</label>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-start justify-center gap-4">
            {/* Hours */}
            <div className="flex flex-col items-center gap-1.5 w-20">
              <button
                type="button"
                onClick={incrementHour}
                className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <ChevronUp className="h-5 w-5 text-slate-600" />
              </button>
              <div className="w-full h-14 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-slate-200">
                <span className="text-3xl font-bold text-slate-900">{hour}</span>
              </div>
              <button
                type="button"
                onClick={decrementHour}
                className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <ChevronDown className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="text-3xl font-bold text-slate-400 pt-2">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center gap-1.5 w-20">
              <button
                type="button"
                onClick={incrementMinute}
                className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <ChevronUp className="h-5 w-5 text-slate-600" />
              </button>
              <div className="w-full h-14 flex items-center justify-center bg-slate-50 rounded-lg border-2 border-slate-200">
                <span className="text-3xl font-bold text-slate-900">{minute.toString().padStart(2, '0')}</span>
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                className="p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <ChevronDown className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="w-4"></div>

            {/* AM/PM */}
            <div className="flex flex-col items-center gap-1.5 w-20">
              <div className="h-6"></div>
              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => handleTimeChange(hour, minute, true)}
                  className={cn(
                    "w-full py-2.5 rounded-lg font-semibold text-sm transition-all",
                    isAM
                      ? "bg-indigo-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hour, minute, false)}
                  className={cn(
                    "w-full py-2.5 rounded-lg font-semibold text-sm transition-all",
                    !isAM
                      ? "bg-indigo-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  PM
                </button>
              </div>
              <div className="h-6"></div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

