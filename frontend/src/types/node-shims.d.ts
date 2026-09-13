declare module "events" {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }
}

declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): number;