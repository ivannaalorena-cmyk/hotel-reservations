export interface Reservation {
  id: string;
  name: string;
  employee: string;
  phone: string;
  email: string;
  origin: string;
  date: string;
  roomType: RoomType;
  numPeople: number;
  roomNumber: string;
  paymentType: PaymentType;
  anticipoPaid: string;
  price: number;
  status: ReservationStatus;
  comments: string;
  registrationDate: string;
  checkout: string;
  reservationId: string;
  municipio: boolean;
  factura: boolean;
  rowIndex?: number;
}

export type RoomType = '1 Cama Matrimonial' | '1 Cama King Size' | '2 Camas Matrimoniales' | '2 Camas King Size';
export type PaymentType = 'Tarjeta' | 'Efectivo' | 'Pago Faltante';
export type ReservationStatus = 'Reserva' | 'Check-in';

export const ROOM_TYPES: RoomType[] = ['1 Cama Matrimonial', '1 Cama King Size', '2 Camas Matrimoniales', '2 Camas King Size'];
export const PAYMENT_TYPES: PaymentType[] = ['Efectivo', 'Tarjeta', 'Pago Faltante'];
export const STATUSES: ReservationStatus[] = ['Reserva', 'Check-in'];

// Default prices (seed) — actual prices come from backend config
export const DEFAULT_PRICES: Record<RoomType, number> = {
  '1 Cama Matrimonial': 900,
  '1 Cama King Size': 1100,
  '2 Camas Matrimoniales': 1500,
  '2 Camas King Size': 1700,
};

export const PEOPLE_OPTIONS: Record<RoomType, number[]> = {
  '1 Cama Matrimonial': [1, 2],
  '1 Cama King Size': [1, 2],
  '2 Camas Matrimoniales': [1, 2, 3, 4],
  '2 Camas King Size': [1, 2, 3, 4, 5, 6],
};

export interface RoomDef { num: number; type: RoomType; typeShort: string; blocked?: boolean; reason?: string; }

// Default rooms (seed) — 112 removed, 130 added as 2 Camas Matrimoniales
export const DEFAULT_ROOMS: RoomDef[] = [
  { num: 101, type: '1 Cama King Size', typeShort: 'King' },
  { num: 102, type: '1 Cama King Size', typeShort: 'King' },
  { num: 103, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 104, type: '1 Cama King Size', typeShort: 'King' },
  { num: 105, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 106, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 107, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 108, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 109, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 110, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 111, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 113, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 114, type: '1 Cama King Size', typeShort: 'King' },
  { num: 115, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 116, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 117, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 118, type: '1 Cama King Size', typeShort: 'King' },
  { num: 119, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 120, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 121, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 122, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 123, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 124, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 125, type: '2 Camas King Size', typeShort: '2xKing' },
  { num: 126, type: '2 Camas King Size', typeShort: '2xKing' },
  { num: 127, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 128, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 129, type: '2 Camas King Size', typeShort: '2xKing' },
  { num: 130, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
];

export function shortFor(type: RoomType): string {
  return type === '1 Cama Matrimonial' ? 'Mat' : type === '1 Cama King Size' ? 'King' : type === '2 Camas Matrimoniales' ? '2xMat' : '2xKing';
}

export interface MaintenanceItem { id: string; timestamp: string; room: string; description: string; status: string; createdBy: string; }
export interface UserAccess { password: string; role: string; label: string; lastUsed: string; }

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export const DEFAULT_USD_RATE = 18.5;
