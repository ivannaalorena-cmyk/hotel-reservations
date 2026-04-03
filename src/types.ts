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
  anticipoPaid: boolean;
  price: number;
  status: ReservationStatus;
  comments: string;
  registrationDate: string;
  rowIndex?: number;
}

export type RoomType = '1 Cama Matrimonial' | '1 Cama King Size' | '2 Camas Matrimoniales' | '2 Camas King Size';
export type PaymentType = 'Tarjeta' | 'Efectivo' | 'Pago Faltante';
export type ReservationStatus = 'Reserva' | 'Check-in';

export const ROOM_TYPES: RoomType[] = ['1 Cama Matrimonial', '1 Cama King Size', '2 Camas Matrimoniales', '2 Camas King Size'];
export const PAYMENT_TYPES: PaymentType[] = ['Tarjeta', 'Efectivo', 'Pago Faltante'];
export const STATUSES: ReservationStatus[] = ['Reserva', 'Check-in'];

export const ROOM_PRICES: Record<RoomType, number> = { '1 Cama Matrimonial': 900, '1 Cama King Size': 1100, '2 Camas Matrimoniales': 1500, '2 Camas King Size': 1700 };
export const TOTAL_ROOMS: Record<RoomType, number> = { '1 Cama Matrimonial': 5, '1 Cama King Size': 6, '2 Camas Matrimoniales': 15, '2 Camas King Size': 3 };
export const PEOPLE_OPTIONS: Record<RoomType, number[]> = { '1 Cama Matrimonial': [1, 2], '1 Cama King Size': [1, 2], '2 Camas Matrimoniales': [1, 2, 3, 4], '2 Camas King Size': [1, 2, 3, 4, 5, 6] };

export interface RoomDef { num: number; type: RoomType; typeShort: string; }
export const ROOM_MAP: RoomDef[] = [
  { num: 1, type: '1 Cama Matrimonial', typeShort: 'Mat' },{ num: 2, type: '1 Cama Matrimonial', typeShort: 'Mat' },{ num: 3, type: '1 Cama Matrimonial', typeShort: 'Mat' },{ num: 4, type: '1 Cama Matrimonial', typeShort: 'Mat' },{ num: 5, type: '1 Cama Matrimonial', typeShort: 'Mat' },
  { num: 6, type: '1 Cama King Size', typeShort: 'King' },{ num: 7, type: '1 Cama King Size', typeShort: 'King' },{ num: 8, type: '1 Cama King Size', typeShort: 'King' },{ num: 9, type: '1 Cama King Size', typeShort: 'King' },{ num: 10, type: '1 Cama King Size', typeShort: 'King' },{ num: 11, type: '1 Cama King Size', typeShort: 'King' },
  { num: 12, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 13, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 14, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 15, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 16, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 17, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 18, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 19, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 20, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 21, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 22, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 23, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 24, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 25, type: '2 Camas Matrimoniales', typeShort: '2xMat' },{ num: 26, type: '2 Camas Matrimoniales', typeShort: '2xMat' },
  { num: 27, type: '2 Camas King Size', typeShort: '2xKing' },{ num: 28, type: '2 Camas King Size', typeShort: '2xKing' },{ num: 29, type: '2 Camas King Size', typeShort: '2xKing' },
];

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
