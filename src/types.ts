export interface Reservation {
  id: string;
  name: string;
  date: string;
  roomType: RoomType;
  paymentType: PaymentType;
  price: number;
  registrationDate: string;
  rowIndex?: number;
}

export type RoomType =
  | '1 Cama Matrimonial'
  | '1 Cama King Size'
  | '2 Camas Matrimoniales'
  | '2 Camas King Size';

export type PaymentType = 'Tarjeta' | 'Efectivo' | 'Pago Faltante';

export interface RoomAvailability {
  total: number;
  booked: number;
  available: number;
}

export interface DayAvailability {
  [roomType: string]: RoomAvailability;
}

export const ROOM_TYPES: RoomType[] = [
  '1 Cama Matrimonial',
  '1 Cama King Size',
  '2 Camas Matrimoniales',
  '2 Camas King Size',
];

export const PAYMENT_TYPES: PaymentType[] = ['Tarjeta', 'Efectivo', 'Pago Faltante'];

export const ROOM_PRICES: Record<RoomType, number> = {
  '1 Cama Matrimonial': 900,
  '1 Cama King Size': 1100,
  '2 Camas Matrimoniales': 1500,
  '2 Camas King Size': 1700,
};

export const TOTAL_ROOMS: Record<RoomType, number> = {
  '1 Cama Matrimonial': 3,
  '1 Cama King Size': 4,
  '2 Camas Matrimoniales': 10,
  '2 Camas King Size': 2,
};

export const ROOM_ICONS: Record<RoomType, string> = {
  '1 Cama Matrimonial': '🛏️',
  '1 Cama King Size': '👑',
  '2 Camas Matrimoniales': '🛏️🛏️',
  '2 Camas King Size': '👑👑',
};

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
