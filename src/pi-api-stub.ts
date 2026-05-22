// Stub for Pi ExtensionAPI — minimal surface
export interface ExtensionAPI {
  registerTool(config: any): void;
  registerCommand(name: string, config: any): void;
  events: {
    emit(event: string, data: any): void;
    on(event: string, handler: (data: any) => void): void;
  };
}
