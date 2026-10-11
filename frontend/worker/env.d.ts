// Minimal ambient types for the Cloudflare runtime so the Worker can be
// type-checked together with the app without adding @cloudflare/workers-types.
declare module "cloudflare:workers" {
  export class DurableObject<Env = unknown> {
    ctx: {
      storage: {
        get<T = unknown>(key: string): Promise<T | undefined>;
        put(key: string, value: unknown): Promise<void>;
        setAlarm(time: number): Promise<void>;
        deleteAlarm(): Promise<void>;
        deleteAll(): Promise<void>;
      };
    };
    env: Env;
    constructor(ctx: unknown, env: Env);
  }
}

interface DurableObjectId {}
interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface WebSocket {
  accept(): void;
}

interface ResponseInit {
  webSocket?: WebSocket;
}
