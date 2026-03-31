const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzijjds_LtVyIm7R6_W7i5hgjwBhMA0uIQOk3byv2hmP5tfF2LD8FGYZMirFoG8lME2/exec';

async function gasGet(params: Record<string, string>) {
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  try {
    const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    return await res.json();
  } catch (err) {
    console.error('GAS request error:', err);
    return null;
  }
}

export async function apiLogin(password: string): Promise<boolean> {
  const data = await gasGet({ action: 'login', password });
  return data?.success === true;
}

export async function apiGetReservations(startDate: string, endDate: string) {
  const data = await gasGet({ action: 'getReservations', startDate, endDate });
  return data?.reservations || [];
}

export async function apiAddReservation(reservation: {
  name: string;
  employee: string;
  phone: string;
  email: string;
  date: string;
  roomType: string;
  numPeople: number;
  roomNumber: string;
  paymentType: string;
  anticipoPaid: boolean;
}) {
  const data = await gasGet({
    action: 'addReservation',
    name: reservation.name,
    employee: reservation.employee,
    phone: reservation.phone,
    email: reservation.email,
    date: reservation.date,
    roomType: reservation.roomType,
    numPeople: reservation.numPeople.toString(),
    roomNumber: reservation.roomNumber,
    paymentType: reservation.paymentType,
    anticipoPaid: reservation.anticipoPaid ? 'true' : 'false',
  });
  return data || { error: 'Error de conexion' };
}

export async function apiUpdateReservation(reservation: {
  rowIndex: number;
  name: string;
  employee: string;
  phone: string;
  email: string;
  date: string;
  roomType: string;
  numPeople: number;
  roomNumber: string;
  paymentType: string;
  anticipoPaid: boolean;
  status: string;
}) {
  const data = await gasGet({
    action: 'updateReservation',
    rowIndex: reservation.rowIndex.toString(),
    name: reservation.name,
    employee: reservation.employee,
    phone: reservation.phone,
    email: reservation.email,
    date: reservation.date,
    roomType: reservation.roomType,
    numPeople: reservation.numPeople.toString(),
    roomNumber: reservation.roomNumber,
    paymentType: reservation.paymentType,
    anticipoPaid: reservation.anticipoPaid ? 'true' : 'false',
    status: reservation.status,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiDeleteReservation(rowIndex: number) {
  const data = await gasGet({ action: 'deleteReservation', rowIndex: rowIndex.toString() });
  return data || { error: 'Error de conexion' };
}

export async function apiGetAvailability(date: string) {
  const data = await gasGet({ action: 'getAvailability', date });
  return data?.availability || {};
}
