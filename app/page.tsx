"use client";
import useSound from "use-sound";
import { useState, useEffect } from "react";
import usePartySocket from "partysocket/react";

const COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
const GRID_SIZE = 30;
const DEFAULT_COLOR = "#ffffff";

export default function Home() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [connectedUsers, setConnectedUsers] = useState(1); // Default to 1 (self)
  const [play] = useSound("/pop.mp3");

  // Create initial empty grid if none exists
  useEffect(() => {
    if (grid.length === 0) {
      const initialGrid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(DEFAULT_COLOR)
      );
      setGrid(initialGrid);
    }
  }, [grid.length]);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_SERVER_URL, // Update for production
    room: "default-room",
    onMessage(event) {
      const data = JSON.parse(event.data);
      console.log("Received message:", data.type);

      if (data.type === "init") {
        setGrid(data.grid);
        if (data.userCount !== undefined) {
          setConnectedUsers(data.userCount);
        }
      } else if (data.type === "cell-updated") {
        setGrid(prev => {
          const newGrid = JSON.parse(JSON.stringify(prev)); // Deep copy to ensure re-render
          newGrid[data.row][data.col] = data.color;
          return newGrid;
        });
        play();
      } else if (data.type === "grid-reset") {
        // Reset grid when receiving reset message from server
        const resetGrid = Array(GRID_SIZE).fill(null).map(() => 
          Array(GRID_SIZE).fill(DEFAULT_COLOR)
        );
        setGrid(resetGrid);
        play();
      } else if (data.type === "user-count-updated") {
        setConnectedUsers(data.count);
      }
    },
  });

  const updateCell = (row: number, col: number) => {
    // Optimistically update UI first
    setGrid(prev => {
      const newGrid = JSON.parse(JSON.stringify(prev)); // Deep copy to ensure re-render
      newGrid[row][col] = selectedColor;
      return newGrid;
    });
    
    // Then send update to server
    socket.send(JSON.stringify({
      type: "update-cell",
      row,
      col,
      color: selectedColor
    }));
  };

  const resetGrid = () => {
    // Optimistically update UI first with all white cells
    const resetGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(DEFAULT_COLOR)
    );
    setGrid(resetGrid);
    
    // Play sound for feedback
    play();
    
    // Send reset command to server
    socket.send(JSON.stringify({
      type: "grid-reset"
    }));
  };

  if (!grid || grid.length === 0) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Collaborative Grid</h1>
            
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={resetGrid}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors font-medium text-black"
          aria-label="Reset grid to all white"
        >
          Reset Grid
        </button>
        
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {connectedUsers} {connectedUsers === 1 ? 'user' : 'users'} online
          </div>
          
          <div className="text-sm">
            {socket.readyState === WebSocket.OPEN ? 
              <span className="text-green-500">● Connected</span> : 
              <span className="text-red-500">● Disconnected</span>
            }
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 mb-6">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-10 h-10 rounded-full transition-transform ${selectedColor === color ? "ring-4 ring-black scale-110" : ""}`}
            style={{ backgroundColor: color }}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      
      <div className="grid gap-1 mb-6" style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
      }}>
        {grid.map((row, i) => 
          row.map((color, j) => (
            <button
              key={`${i}-${j}`}
              onClick={() => updateCell(i, j)}
              className="w-10 h-10 rounded-full transition-colors duration-200 hover:opacity-80"
              style={{ backgroundColor: color }}
              aria-label={`Grid cell at row ${i}, column ${j}`}
            />
          ))
        )}
      </div>
    </div>
  );
}