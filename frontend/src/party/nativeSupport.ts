// Feature detection for Party networking.
//
// react-native-tcp-socket / react-native-udp require a native/dev build.
// In Expo Go, the web preview and any environment without the linked native
// modules, these imports throw at runtime. We detect that once and expose a
// simple boolean so the UI can gracefully degrade.

import { Platform } from "react-native";

// Explicit types for the tiny subset of the native APIs we actually use so
// the rest of the codebase can be strict without pulling every native symbol.
export type TcpServerModule = {
  createServer: (
    opts: unknown,
    listener: (socket: TcpSocket) => void,
  ) => TcpServerInstance;
};
export type TcpServerInstance = {
  listen: (opts: { port: number; host?: string }, cb?: () => void) => TcpServerInstance;
  close: (cb?: () => void) => void;
  on: (evt: string, cb: (...args: unknown[]) => void) => void;
  address?: () => { port: number; address: string } | null;
};
export type TcpSocket = {
  write: (data: string) => boolean;
  end: () => void;
  destroy: () => void;
  on: (evt: string, cb: (...args: unknown[]) => void) => void;
  setEncoding?: (enc: string) => void;
  remoteAddress?: string;
  remotePort?: number;
};
export type TcpModule = {
  Server: TcpServerModule;
  createConnection: (
    opts: { host: string; port: number },
    cb?: () => void,
  ) => TcpSocket;
};

export type UdpSocketInstance = {
  bind: (port: number, cb?: () => void) => void;
  send: (
    data: Uint8Array | string,
    offset: number,
    length: number,
    port: number,
    address: string,
    cb?: (err?: unknown) => void,
  ) => void;
  close: () => void;
  setBroadcast: (flag: boolean) => void;
  on: (evt: string, cb: (...args: unknown[]) => void) => void;
};
export type UdpModule = {
  createSocket: (opts: { type: "udp4"; reusePort?: boolean }) => UdpSocketInstance;
};

let tcp: TcpModule | null = null;
let udp: UdpModule | null = null;
let checked = false;

export function loadNative(): { tcp: TcpModule | null; udp: UdpModule | null } {
  if (checked) return { tcp, udp };
  checked = true;
  if (Platform.OS === "web") return { tcp, udp };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    tcp = require("react-native-tcp-socket") as TcpModule;
  } catch {
    tcp = null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    udp = require("react-native-udp") as unknown as UdpModule;
  } catch {
    udp = null;
  }
  return { tcp, udp };
}

export function isPartySupported(): boolean {
  const { tcp: t, udp: u } = loadNative();
  return t != null && u != null;
}

export const PARTY_UNSUPPORTED_REASON =
  Platform.OS === "web"
    ? "Party runs over local Wi-Fi and is not available in the web preview. Install the built Android or iOS app to use it."
    : "Party requires the installed app (Android/iOS build). It doesn't run inside Expo Go.";
