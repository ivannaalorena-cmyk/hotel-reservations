export interface Reservation {
  id: string;
  name: string;
  employee: string;
  phone: string;
  email: string;
  date: string;
  roomType: RoomType;
  numPeople: number;
  roomNumber: string;
  paymentType: PaymentType;
  anticipoPaid: boolean;
  price: number;
  status: ReservationStatus;
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

export interface RoomInfo { number: number; type: RoomType; typeShort: string; }

export const ROOM_MAP: RoomInfo[] = [
  { number: 1, type: '1 Cama Matrimonial', typeShort: 'Matrimonial' },
  { number: 2, type: '1 Cama Matrimonial', typeShort: 'Matrimonial' },
  { number: 3, type: '1 Cama Matrimonial', typeShort: 'Matrimonial' },
  { number: 4, type: '1 Cama Matrimonial', typeShort: 'Matrimonial' },
  { number: 5, type: '1 Cama Matrimonial', typeShort: 'Matrimonial' },
  { number: 6, type: '1 Cama King Size', typeShort: 'King' },
  { number: 7, type: '1 Cama King Size', typeShort: 'King' },
  { number: 8, type: '1 Cama King Size', typeShort: 'King' },
  { number: 9, type: '1 Cama King Size', typeShort: 'King' },
  { number: 10, type: '1 Cama King Size', typeShort: 'King' },
  { number: 11, type: '1 Cama King Size', typeShort: 'King' },
  { number: 12, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 13, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 14, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 15, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 16, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 17, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 18, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 19, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 20, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 21, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 22, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 23, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 24, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 25, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 26, type: '2 Camas Matrimoniales', typeShort: '2 Matrim.' },
  { number: 27, type: '2 Camas King Size', typeShort: '2 King' },
  { number: 28, type: '2 Camas King Size', typeShort: '2 King' },
  { number: 29, type: '2 Camas King Size', typeShort: '2 King' },
];

export const ROOM_TYPE_GROUPS = [
  { type: '1 Cama Matrimonial' as RoomType, label: '1 Cama Matrimonial (1-5)', rooms: [1,2,3,4,5] },
  { type: '1 Cama King Size' as RoomType, label: '1 Cama King Size (6-11)', rooms: [6,7,8,9,10,11] },
  { type: '2 Camas Matrimoniales' as RoomType, label: '2 Camas Matrimoniales (12-26)', rooms: [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26] },
  { type: '2 Camas King Size' as RoomType, label: '2 Camas King Size (27-29)', rooms: [27,28,29] },
];

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
