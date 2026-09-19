import { GatewayStatus } from './api.models';

export interface Gateway {
  id: number;
  deviceId: string;
  name: string;
  operator: string;
  phoneNumber?: string;
  status: GatewayStatus;
  loadScore: number;
  batteryLevel: number;
  networkStrength: number;
  latitude?: number;
  longitude?: number;
  memoryFreeMb?: number;
  storageFreeMb?: number;
  temperature?: number;
  internetAvailable: boolean;
  lastHeartbeatAt?: string;
  lastIdleAt?: string;
  /** True si un PIN USSD est configuré (valeur jamais exposée). */
  ussdPinSet?: boolean;
}

export interface GatewayRegisterRequest {
  deviceId: string;
  name: string;
  operator: string;
  phoneNumber?: string;
  apiKey?: string;
  /** PIN Mobile Money / USSD (4–6 chiffres). */
  ussdPin?: string;
}

export interface GatewayUpdateRequest {
  name?: string;
  phoneNumber?: string;
  status?: GatewayStatus;
  /** Nouveau PIN ; omit / vide = conserver. */
  ussdPin?: string;
}

export interface DashboardStats {
  gatewaysTotal: number;
  gatewaysOnline: number;
  gatewaysOffline: number;
  gatewaysActive: number;
  lowBattery: number;
  poorNetwork: number;
  txPerMin: number;
  smsPerMin: number;
  distributorBalance: number;
  alerts24h: number;
  gatewaysByStatus?: Array<{ status: string; count: number }>;
  series?: Array<{ t: string; tx: number; sms: number }>;
}
