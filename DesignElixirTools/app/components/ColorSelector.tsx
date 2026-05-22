// components/ColorSelector.tsx
import { useState, useEffect, useRef } from 'react';

interface ColorSelectorProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const COLOR_PALETTE = [
  // Reds
  '#FF0000', '#FF3333', '#FF6666', '#FF9999', '#CC0000', '#990000',
  '#FF1a1a', '#FF4d4d', '#FF8080', '#FFb3b3', '#CC3333', '#CC6666',
  
  // Oranges
  '#FF6600', '#FF8800', '#FFAA00', '#FF9933', '#FF7722', '#CC5500',
  '#FF9966', '#FFB366', '#FFCC66', '#FF6633', '#FF8833', '#CC6633',
  
  // Yellows
  '#FFFF00', '#FFFF33', '#FFFF66', '#FFFF99', '#FFCC00', '#FFD700',
  '#FFEE00', '#FFFF1a', '#FFFF4d', '#FFFF80', '#FFE600', '#FFDD00',
  
  // Greens
  '#00FF00', '#33FF33', '#66FF66', '#99FF99', '#00CC00', '#009900',
  '#00FF33', '#33FF66', '#66FF99', '#99FFcc', '#22CC22', '#44DD44',
  '#32CD32', '#00FF7F', '#00FA9A', '#90EE90', '#98FB98', '#3CB371',
  
  // Blues
  '#0000FF', '#3333FF', '#6666FF', '#9999FF', '#0000CC', '#000099',
  '#1a1aFF', '#4d4dFF', '#8080FF', '#b3b3FF', '#0066FF', '#0099FF',
  '#00CCFF', '#33CCFF', '#66CCFF', '#1E90FF', '#4169E1', '#6495ED',
  '#87CEEB', '#00BFFF', '#5F9EA0', '#4682B4', '#6A5ACD', '#7B68EE',
  
  // Purples
  '#9900FF', '#AA00FF', '#BB00FF', '#CC00FF', '#8800CC', '#6600AA',
  '#AA33FF', '#BB66FF', '#CC99FF', '#9933CC', '#8833BB', '#7722AA',
  '#9370DB', '#8A2BE2', '#9400D3', '#9932CC', '#BA55D3', '#DA70D6',
  
  // Pinks
  '#FF00FF', '#FF33FF', '#FF66FF', '#FF99FF', '#CC00CC', '#FF1493',
  '#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1aFF', '#FF4dFF', '#FF80FF',
  '#C71585', '#DB7093', '#E6007E', '#FF00AA', '#FF33CC', '#FF66DD'
];

export default function ColorSelector({ selectedColor, onColorChange }: ColorSelectorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(selectedColor);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomColor(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomColor(value);
    
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorChange(value);
    }
  };

  return (
    <div ref={pickerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowColorPicker(!showColorPicker)}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: selectedColor,
          cursor: 'pointer',
          border: '3px solid #ddd',
        }}
      />
      {showColorPicker && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: 0,
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          width: '300px',
        }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#FF0000"
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '8px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {COLOR_PALETTE.map((color) => (
              <div
                key={color}
                onClick={() => {
                  onColorChange(color);
                  setShowColorPicker(false);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: selectedColor === color ? '3px solid #333' : '2px solid #ddd',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get a random color from the palette
export const getRandomColor = () => {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
};