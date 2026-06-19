"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { supabase } from '@/lib/supabase';
import { useToast } from './toast';
import { Camera as CameraIcon, Check, RefreshCw, Upload } from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate years from current year down to 1940
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

interface DobPickerModalProps {
  userId: string;
  onSaveSuccess: (dob: string, selfieUrl: string) => void;
}

export function DobPickerModal({ userId, onSaveSuccess }: DobPickerModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  
  // Wizard steps: 'dob' or 'selfie'
  const [step, setStep] = useState<'dob' | 'selfie'>('dob');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0); 
  const [selectedDay, setSelectedDay] = useState(5);
  const [selectedYear, setSelectedYear] = useState(2002);
  const [saving, setSaving] = useState(false);

  // Selfie states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (step === 'dob') {
      setTimeout(() => {
        if (monthRef.current) monthRef.current.scrollTop = 0;
        if (dayRef.current) dayRef.current.scrollTop = (5 - 1) * ITEM_HEIGHT;
        
        const yearIdx = YEARS.indexOf(2002);
        if (yearRef.current && yearIdx !== -1) {
          yearRef.current.scrollTop = yearIdx * ITEM_HEIGHT;
        }
      }, 100);
    }
  }, [step]);

  // Update selected day if month days decrease
  useEffect(() => {
    if (selectedDay > daysCount) {
      setSelectedDay(daysCount);
      if (dayRef.current) {
        dayRef.current.scrollTop = (daysCount - 1) * ITEM_HEIGHT;
      }
    }
  }, [selectedMonthIdx, selectedYear, daysCount, selectedDay]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

  // Start webcam feed for selfie verification
  const startWebcam = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 }
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Direct webcam unavailable. Falling back to native system camera/uploads.", err);
      setCameraActive(false);
    }
  };

  // Stop webcam feed
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Transition to Selfie Capture
  const handleDobConfirm = () => {
    setStep('selfie');
    startWebcam();
  };

  // Capture frame from webcam
  const handleCaptureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, 400, 400);
        const base64Img = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedSelfie(base64Img);
        stopWebcam();
      }
    }
  };

  // File Upload fallback for devices/browsers that block direct webcam
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedSelfie(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      stopWebcam();
    }
  };

  // Save DOB and Selfie to database
  const handleSaveAll = async () => {
    if (!capturedSelfie) {
      toastError('Please capture or upload a selfie image to complete verification.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          dob: formattedDate,
          selfie_url: capturedSelfie
        })
        .eq('id', userId);

      if (error) throw error;

      toastSuccess('Verification details saved successfully!');
      onSaveSuccess(formattedDate, capturedSelfie);
    } catch (err: any) {
      toastError(err.message || 'Failed to save verification onboarding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-card w-full max-w-sm rounded-[32px] overflow-hidden border border-border shadow-2xl flex flex-col p-6 space-y-5 text-center transition-all duration-300">
        
        {step === 'dob' ? (
          <>
            {/* STEP 1: DATE OF BIRTH */}
            <div className="py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/25">
                Step 1 of 2: Age Verification
              </span>
              <h2 className="text-2xl font-black tracking-tight text-foreground/90 font-mono mt-4">
                {formattedDate}
              </h2>
              <div className="h-[1px] bg-border/60 mt-3 w-full" />
            </div>

            {/* Wheel Picker Selectors */}
            <div className="relative h-[200px] flex justify-center items-center overflow-hidden">
              <div className="absolute left-0 right-0 h-11 bg-muted/60 dark:bg-muted/30 rounded-2xl border-y border-border/40 pointer-events-none z-10" />

              {/* Month */}
              <div 
                ref={monthRef}
                onScroll={(e) => handleScroll(e, 'month')}
                className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[78px]"
                style={{ scrollbarWidth: 'none' }}
              >
                {MONTHS.map((month, i) => (
                  <div 
                    key={month}
                    className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                      i === selectedMonthIdx 
                        ? 'text-foreground scale-105' 
                        : 'text-muted-foreground/35 scale-95'
                    }`}
                  >
                    {month}
                  </div>
                ))}
              </div>

              {/* Day */}
              <div 
                ref={dayRef}
                onScroll={(e) => handleScroll(e, 'day')}
                className="w-14 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[78px]"
                style={{ scrollbarWidth: 'none' }}
              >
                {DAYS.map((day) => (
                  <div 
                    key={day}
                    className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                      day === selectedDay 
                        ? 'text-foreground scale-105' 
                        : 'text-muted-foreground/35 scale-95'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Year */}
              <div 
                ref={yearRef}
                onScroll={(e) => handleScroll(e, 'year')}
                className="w-20 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[78px]"
                style={{ scrollbarWidth: 'none' }}
              >
                {YEARS.map((year) => (
                  <div 
                    key={year}
                    className={`h-11 flex items-center justify-center snap-center text-sm font-black transition-all duration-150 ${
                      year === selectedYear 
                        ? 'text-foreground scale-105' 
                        : 'text-muted-foreground/35 scale-95'
                    }`}
                  >
                    {year}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                *Your birthday won't be shown publicly
              </p>
              <Button
                onClick={handleDobConfirm}
                className="w-full rounded-2xl py-3 font-bold bg-primary text-white hover:bg-primary-hover shadow-lg"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* STEP 2: SELFIE VERIFICATION */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/25">
                Step 2 of 2: Selfie Check
              </span>
              <h2 className="text-xl font-black text-foreground mt-3">Webcam Security Selfie</h2>
              <p className="text-xs text-muted-foreground mt-1">Please look straight into the camera to capture a clear photo of your face.</p>
            </div>

            {/* Selfie Preview Screen Container */}
            <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-primary mx-auto bg-muted shadow-inner flex items-center justify-center">
              {capturedSelfie ? (
                <img 
                  src={capturedSelfie} 
                  alt="Selfie snapshot" 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : cameraActive ? (
                <>
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Oval Guidance Mask Overlay */}
                  <div className="absolute inset-2 border-2 border-dashed border-white/60 rounded-full pointer-events-none" />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <CameraIcon className="h-10 w-10 text-muted-foreground animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-bold">Camera Perm Blocked or Offline</span>
                </div>
              )}
            </div>

            {/* Verification Inputs Controls */}
            <div className="space-y-3">
              {cameraActive && !capturedSelfie && (
                <Button 
                  onClick={handleCaptureSelfie}
                  className="w-full rounded-2xl py-3 font-bold bg-primary text-white hover:bg-primary/95 shadow-md flex items-center justify-center gap-1.5"
                >
                  <CameraIcon className="h-4 w-4" />
                  Capture Photo
                </Button>
              )}

              {capturedSelfie && (
                <Button 
                  onClick={() => {
                    setCapturedSelfie(null);
                    startWebcam();
                  }}
                  variant="outline"
                  className="w-full rounded-2xl py-3 font-bold border-border bg-card text-foreground hover:bg-muted shadow-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retake Photo
                </Button>
              )}

              {/* File Upload Fallback always accessible */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="user"
                className="hidden"
              />

              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Photo from Device
              </Button>

              <div className="h-[1px] bg-border/50 my-2" />

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    stopWebcam();
                    setStep('dob');
                  }}
                  className="flex-1 rounded-2xl py-2.5 font-bold border-border bg-card text-foreground hover:bg-muted"
                  disabled={saving}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSaveAll}
                  disabled={saving || !capturedSelfie}
                  className="flex-1 rounded-2xl py-2.5 font-bold bg-green-600 text-white hover:bg-green-600/95 disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Finish'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
