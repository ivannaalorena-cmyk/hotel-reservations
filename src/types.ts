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

export type RoomType =
  | '1 Cama Matrimonial'
  | '1 Cama King Size'
  | '2 Camas Matrimoniales'
  | '2 Camas King Size';

export type PaymentType = 'Tarjeta' | 'Efectivo' | 'Pago Faltante';

export type ReservationStatus = 'Reserva' | 'Check-in';

export interface RoomAvailability {
  total: number;
  booked: number;
  available: number;
}

export const ROOM_TYPES: RoomType[] = [
  '1 Cama Matrimonial',
  '1 Cama King Size',
  '2 Camas Matrimoniales',
  '2 Camas King Size',
];

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

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
