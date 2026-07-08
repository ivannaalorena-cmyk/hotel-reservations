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
  rowIndex?: number;
}

export type RoomType = '1 Cama Matrimonial' | '1 Cama King Size' | '2 Camas Matrimoniales' | '2 Camas King Size';
export type PaymentType = 'Tarjeta' | 'Efectivo' | 'Pago Faltante';
export type ReservationStatus = 'Reserva' | 'Check-in';

export const ROOM_TYPES: RoomType[] = ['1 Cama Matrimonial', '1 Cama King Size', '2 Camas Matrimoniales', '2 Camas King Size'];
export const PAYMENT_TYPES: PaymentType[] = ['Tarjeta', 'Efectivo', 'Pago Faltante'];
export const STATUSES: ReservationStatus[] = ['Reserva', 'Check-in'];

export const ROOM_PRICES: Record<RoomType, number> = {
  '1 Cama Matrimonial': 900,
  '1 Cama King Size': 1100,
  '2 Camas Matrimoniales': 1500,
  '2 Camas King Size': 1700,
};

export const TOTAL_ROOMS: Record<RoomType, number> = {
  '1 Cama Matrimonial': 5,
  '1 Cama King Size': 6,
  '2 Camas Matrimoniales': 15,
  '2 Camas King Size': 3,
};

export const PEOPLE_OPTIONS: Record<RoomType, number[]> = {
  '1 Cama Matrimonial': [1, 2],
  '1 Cama King Size': [1, 2],
  '2 Camas Matrimoniales': [1, 2, 3, 4],
  '2 Camas King Size': [1, 2, 3, 4, 5, 6],
};

export interface RoomDef { num: number; type: RoomType; typeShort: string; }

// Sorted by room number 101-129
export const ROOM_MAP: RoomDef[] = [
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
  { num: 112, type: '1 Cama King Size', typeShort: 'King' },
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
];

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
