'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Check, XCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SubtopicOption {
  topicName: string;
  subtopicName: string;
  _id: string;
}

interface SubtopicSelectorProps {
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  value: string;
  onChange: (value: string) => void;
  options: SubtopicOption[];
  placeholder?: string;
  className?: string;
  subtopicCounts?: {
    [topicName: string]: {
      [subtopicName: string]: {
        negative: number;
        unattempted: number;
      };
    };
  };
}

export default function SubtopicSelector({
  subject,
  value,
  onChange,
  options,
  placeholder = 'Search and select subtopic...',
  className = '',
  subtopicCounts = {}
}: SubtopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log(`🎯 SubtopicSelector for ${subject}:`, {
      optionsCount: options.length,
      options: options,
      firstOption: options[0]
    });
  }, [subject, options]);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.subtopicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.topicName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.subtopicName === value);

  const handleSelect = (subtopicName: string) => {
    console.log('✅ SubtopicSelector: Selected subtopic:', subtopicName);
    onChange(subtopicName);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full min-w-[200px] px-3 py-2 border rounded-md bg-background cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm truncate">
          {selectedOption ? selectedOption.subtopicName : placeholder}
        </span>
        {value && (
          <X
            className="h-4 w-4 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="sticky top-0 bg-background border-b p-2">
            <Input
              type="text"
              placeholder="Search subtopics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No subtopics found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const counts = subtopicCounts[option.topicName]?.[option.subtopicName];
                const negativeCount = counts?.negative || 0;
                const unattemptedCount = counts?.unattempted || 0;
                const hasCounts = negativeCount > 0 || unattemptedCount > 0;
                
                return (
                  <div
                    key={option._id}
                    onClick={() => handleSelect(option.subtopicName)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent rounded-sm ${
                      value === option.subtopicName ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{option.subtopicName}</div>
                        {hasCounts && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {negativeCount > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">
                                <XCircle className="h-2.5 w-2.5 mr-0.5" />
                                {negativeCount}
                              </Badge>
                            )}
                            {unattemptedCount > 0 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                {unattemptedCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{option.topicName}</div>
                    </div>
                    {value === option.subtopicName && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

