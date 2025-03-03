import type * as Party from "partykit/server";

const GRID_SIZE = 30; // Match client size
const DEFAULT_COLOR = "#ffffff";

export default class GridServer implements Party.Server {
  grid: string[][] = [];

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

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`New connection ${conn.id} in room ${this.room.id}`);
    
    // Initialize grid if empty (defensive check)
    if (this.grid.length === 0) {
      this.initializeGrid();
    }
    
    // Send initial grid state to new connection
    conn.send(JSON.stringify({ type: "init", grid: this.grid }));
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

  // Optional: Persist state when server shuts down
  async onClose(): Promise<void> {
    try {
      // You could save the grid state to storage here
      console.log("Server for room", this.room.id, "is closing");
    } catch (error) {
      console.error("Error during server shutdown:", error);
    }
  }
}

GridServer satisfies Party.Worker;