import React, { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimeFieldProps {
  id?: string;
  label?: string;
  value: string; // 24-hour format (HH:mm)
  onChange: (value: string) => void;
  className?: string;
}

export function TimeField({ id, label, value, onChange, className }: TimeFieldProps) {
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute] = useState<string>('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  
  // Initialize component with the provided value
  useEffect(() => {
    try {
      if (value) {
        const date = parse(value, 'HH:mm', new Date());
        setHour(format(date, 'h'));
        setMinute(format(date, 'mm'));
        setPeriod(format(date, 'a').toUpperCase() as 'AM' | 'PM');
      }
    } catch (error) {
      console.error('Error parsing time:', error);
    }
  }, [value]);
  
  // Update the time when any component changes
  useEffect(() => {
    try {
      // Create a time string in 12-hour format
      const timeString = `${hour}:${minute} ${period}`;
      
      // Parse and convert to 24-hour format
      const date = parse(timeString, 'h:mm a', new Date());
      const formattedTime = format(date, 'HH:mm');
      
      onChange(formattedTime);
    } catch (error) {
      console.error('Error formatting time:', error);
    }
  }, [hour, minute, period, onChange]);
  
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex items-center space-x-2">
        <Select value={hour} onValueChange={setHour}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {hours.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span>:</span>
        
        <Select value={minute} onValueChange={setMinute}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={period} 
          onValueChange={(value) => setPeriod(value as 'AM' | 'PM')}
        >
          <SelectTrigger className="w-20">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}