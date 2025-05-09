import { storage } from "./storage";

interface MemoryEntry {
  userId: number;
  context: string;
  data: any;
  timestamp: Date;
}

class MemoryLayer {
  private static instance: MemoryLayer;
  private memory: Map<number, MemoryEntry[]>;

  private constructor() {
    this.memory = new Map();
  }

  static getInstance(): MemoryLayer {
    if (!MemoryLayer.instance) {
      MemoryLayer.instance = new MemoryLayer();
    }
    return MemoryLayer.instance;
  }

  async storeMemory(userId: number, context: string, data: any) {
    try {
      // Validate inputs
      if (typeof userId !== 'number' || !context || !data) {
        throw new Error("Invalid parameters provided to store memory");
      }

      const entry: MemoryEntry = {
        userId,
        context,
        data,
        timestamp: new Date(),
      };

      if (!this.memory.has(userId)) {
        this.memory.set(userId, []);
      }

      this.memory.get(userId)!.push(entry);

      // Save to external storage (database, file, etc.)
      await storage.saveUserMemory(userId, entry);
    } catch (error) {
      console.error("Error storing memory:", error);
      throw new Error("Failed to store user memory");
    }
  }

  async retrieveMemory(userId: number, context: string): Promise<any[]> {
    try {
      // Validate inputs
      if (typeof userId !== 'number' || !context) {
        throw new Error("Invalid parameters provided to retrieve memory");
      }

      const memories = this.memory.get(userId) || [];
      const filteredMemories = memories.filter(m => m.context === context);

      return filteredMemories.map(m => m.data);
    } catch (error) {
      console.error("Error retrieving memory:", error);
      throw new Error("Failed to retrieve user memory");
    }
  }

  async getPersonalizedContext(userId: number): Promise<string> {
    try {
      const memories = await this.retrieveMemory(userId, "preferences");
      if (memories.length === 0) return "No preferences found.";

      return `Based on your previous interactions, you prefer ${memories.join(", ")}.`;
    } catch (error) {
      console.error("Error generating personalized context:", error);
      return "Error generating personalized context.";
    }
  }

  async clearMemory(userId: number) {
    try {
      if (this.memory.has(userId)) {
        this.memory.delete(userId);
      }

      // Optionally, clear memory from persistent storage
      await storage.clearUserMemory(userId);
    } catch (error) {
      console.error("Error clearing memory:", error);
      throw new Error("Failed to clear user memory");
    }
  }

  async clearAllMemory() {
    try {
      this.memory.clear();

      // Optionally, clear all memory from persistent storage
      await storage.clearAllUserMemory();
    } catch (error) {
      console.error("Error clearing all memory:", error);
      throw new Error("Failed to clear all user memory");
    }
  }
}

// Singleton instance
export const memoryLayer = MemoryLayer.getInstance();
