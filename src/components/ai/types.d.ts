export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIStreamingChunk {
  content?: string;
  done?: boolean;
  raw?: any;
}