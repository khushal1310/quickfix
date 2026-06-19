"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { supabase } from '@/lib/supabase';
import { useToast } from './toast';
import { useAuth } from '@/hooks/useAuth';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate years from current year down to 1940
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

interface DobPickerModalProps {
  userId: string;
  onSaveSuccess: (dob: string) => void;
}

export function DobPickerModal({ userId, onSaveSuccess }: DobPickerModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0); // 0-indexed January
  const [selectedDay, setSelectedDay] = useState(5);
  const [selectedYear, setSelectedYear] = useState(2002);
  const [saving, setSaving] = useState(false);

  // Refs for scroll columns to support touch/scroll interaction
  const monthRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Calculate days in selected month and year
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedMonthIdx, selectedYear);
  const DAYS = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Format selected date as YYYY-MM-DD
  const formattedMonth = String(selectedMonthIdx + 1).padStart(2, '0');
  const formattedDay = String(selectedDay).padStart(2, '0');
  const formattedDate = `${selectedYear}-${formattedMonth}-${formattedDay}`;

  // Wheel line height in px
  const ITEM_HEIGHT = 44;

  // Initialize scroll positions
  useEffect(() => {
    // January index = 0, scroll to 0
    // Day 5 index = 4 (5 - 1), scroll to 4 * ITEM_HEIGHT
    // Year 2002 index = YEARS.indexOf(2002)
    setTimeout(() => {
      if (monthRef.current) monthRef.current.scrollTop = 0;
      if (dayRef.current) dayRef.current.scrollTop = (5 - 1) * ITEM_HEIGHT;
      
      const yearIdx = YEARS.indexOf(2002);
      if (yearRef.current && yearIdx !== -1) {
        yearRef.current.scrollTop = yearIdx * ITEM_HEIGHT;
      }
    }, 100);
  }, []);

  // Update selected day if month days decrease
  useEffect(() => {
    if (selectedDay > daysCount) {
      setSelectedDay(daysCount);
      if (dayRef.current) {
        dayRef.current.scrollTop = (daysCount - 1) * ITEM_HEIGHT;
      }
    }
  }, [selectedMonthIdx, selectedYear, daysCount, selectedDay]);

  const handleScroll = (
    e: React.UIEvent<HTMLDivElement>, 
    type: 'month' | 'day' | 'year'
  ) => {
    const scrollTop = e.currentTarget.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);

    if (type === 'month') {
      if (idx >= 0 && idx < MONTHS.length) {
        setSelectedMonthIdx(idx);
      }
    } else if (type === 'day') {
      if (idx >= 0 && idx < DAYS.length) {
        setSelectedDay(DAYS[idx]);
      }
    } else if (type === 'year') {
      if (idx >= 0 && idx < YEARS.length) {
        setSelectedYear(YEARS[idx]);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ dob: formattedDate })
        .eq('id', userId);

      if (error) throw error;

      toastSuccess('Birthday saved successfully!');
      onSaveSuccess(formattedDate);
    } catch (err: any) {
      toastError(err.message || 'Failed to save birthday.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-card w-full max-w-sm rounded-[32px] overflow-hidden border border-border shadow-2xl flex flex-col p-6 space-y-6 text-center">
        
        {/* Top date display */}
        <div className="py-2">
          <h2 className="text-2xl font-black tracking-tight text-foreground/90 font-mono">
            {formattedDate}
          </h2>
          <div className="h-[1px] bg-border/60 mt-4 w-full" />
        </div>

        {/* Wheel Date Picker Selectors */}
        <div className="relative h-[220px] flex justify-center items-center overflow-hidden">
          {/* Highlight Selection Bar overlay */}
          <div className="absolute left-0 right-0 h-11 bg-muted/60 dark:bg-muted/30 rounded-2xl border-y border-border/40 pointer-events-none z-10" />

          {/* Month Selector Column */}
          <div 
            ref={monthRef}
            onScroll={(e) => handleScroll(e, 'month')}
            className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[88px]"
            style={{ scrollbarWidth: 'none' }}
          >
            {MONTHS.map((month, i) => {
              const isSelected = i === selectedMonthIdx;
              return (
                <div 
                  key={month}
                  className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                    isSelected 
                      ? 'text-foreground scale-105' 
                      : 'text-muted-foreground/40 scale-95 hover:text-muted-foreground/60'
                  }`}
                >
                  {month}
                </div>
              );
            })}
          </div>

          {/* Day Selector Column */}
          <div 
            ref={dayRef}
            onScroll={(e) => handleScroll(e, 'day')}
            className="w-16 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[88px]"
            style={{ scrollbarWidth: 'none' }}
          >
            {DAYS.map((day) => {
              const isSelected = day === selectedDay;
              return (
                <div 
                  key={day}
                  className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                    isSelected 
                      ? 'text-foreground scale-105' 
                      : 'text-muted-foreground/40 scale-95 hover:text-muted-foreground/60'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Year Selector Column */}
          <div 
            ref={yearRef}
            onScroll={(e) => handleScroll(e, 'year')}
            className="w-24 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[88px]"
            style={{ scrollbarWidth: 'none' }}
          >
            {YEARS.map((year) => {
              const isSelected = year === selectedYear;
              return (
                <div 
                  key={year}
                  className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                    isSelected 
                      ? 'text-foreground scale-105' 
                      : 'text-muted-foreground/40 scale-95 hover:text-muted-foreground/60'
                  }`}
                >
                  {year}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info text */}
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground font-semibold">
            *Your birthday won't be shown publicly
          </p>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl py-3 font-bold bg-primary text-white hover:bg-primary-hover shadow-lg transition-transform active:scale-[0.98]"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
