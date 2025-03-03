import type * as Party from "partykit/server";

export default class GridServer implements Party.Server {
  grid: string[][] = [];

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Initialize grid if empty
    if (this.grid.length === 0) {
      this.grid = Array(20).fill(Array(20).fill("#ffffff"));
    }
    
    console.log(`New connection ${conn.id} in room ${this.room.id}`);
    
    // Send initial grid state to new connection
    conn.send(JSON.stringify({ type: "init", grid: this.grid }));
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      
      if (data.type === "update-cell") {
        // Update grid state
        this.grid[data.row][data.col] = data.color;
        
        // Broadcast update to all other connections
        this.room.broadcast(
          JSON.stringify({
            type: "cell-updated",
            row: data.row,
            col: data.col,
            color: data.color,
          }),
          // Exclude original sender from broadcast
          [sender.id]
        );
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }
}

GridServer satisfies Party.Worker;