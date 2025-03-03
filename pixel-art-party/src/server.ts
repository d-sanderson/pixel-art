import type * as Party from "partykit/server";

const GRID_SIZE = 30;
const DEFAULT_COLOR = "#ffffff";

export default class GridServer implements Party.Server {
  grid: string[][] = [];
  connections: Set<string> = new Set();

  constructor(readonly room: Party.Room) {
    // Initialize grid properly when server starts
    this.initializeGrid();
  }

  // Create a properly immutable grid
  private initializeGrid() {
    this.grid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(DEFAULT_COLOR)
    );
  }

  // Broadcast the current user count to all connections
  private broadcastUserCount() {
    const count = this.connections.size;
    this.room.broadcast(JSON.stringify({
      type: "user-count-updated",
      count
    }));
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`New connection ${conn.id} in room ${this.room.id}`);
    
    // Add connection to our tracking set
    this.connections.add(conn.id);
    
    // Initialize grid if empty (defensive check)
    if (this.grid.length === 0) {
      this.initializeGrid();
    }
    
    // Send initial grid state to new connection with user count
    conn.send(JSON.stringify({ 
      type: "init", 
      grid: this.grid,
      userCount: this.connections.size
    }));
    
    // Broadcast updated user count to all connections
    this.broadcastUserCount();
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      
      if (data.type === "update-cell") {
        // Validate input to prevent errors
        if (
          typeof data.row === 'number' && 
          typeof data.col === 'number' &&
          data.row >= 0 && data.row < this.grid.length &&
          data.col >= 0 && data.col < this.grid[0].length
        ) {
          // Create a new row array to avoid mutation issues
          const newRow = [...this.grid[data.row]];
          newRow[data.col] = data.color;
          
          // Update the grid with the new row
          this.grid[data.row] = newRow;
          
          // Broadcast update to all connections (including sender for consistency)
          this.room.broadcast(
            JSON.stringify({
              type: "cell-updated",
              row: data.row,
              col: data.col,
              color: data.color,
            })
          );
        }
      } else if (data.type === "grid-reset") {
        // Reset the entire grid
        this.initializeGrid();
        
        // Broadcast reset to all connections
        this.room.broadcast(
          JSON.stringify({
            type: "grid-reset"
          })
        );
        
        console.log("Grid reset by", sender.id);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  onClose(conn: Party.Connection) {
    // Remove connection from our tracking set
    this.connections.delete(conn.id);
    console.log(`Connection ${conn.id} closed`);
    
    // Broadcast updated user count
    this.broadcastUserCount();
  }
}

GridServer satisfies Party.Worker;