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

export async function apiLogin(password: string): Promise<{ success: boolean; role: string }> {
  const data = await gasGet({ action: 'login', password });
  return data || { success: false, role: '' };
}

export async function apiGetReservations(startDate: string, endDate: string) {
  const data = await gasGet({ action: 'getReservations', startDate, endDate });
  return data?.reservations || [];
}

export async function apiGetAllReservations() {
  const data = await gasGet({ action: 'getAllReservations' });
  return data?.reservations || [];
}

export async function apiAddReservation(reservation: {
  name: string; employee: string; phone: string; email: string;
  origin: string; startDate: string; endDate: string;
  roomType: string; numPeople: number; roomNumber: string;
  paymentType: string; anticipoPaid: string; comments: string;
}) {
  const data = await gasGet({
    action: 'addReservation',
    name: reservation.name, employee: reservation.employee,
    phone: reservation.phone, email: reservation.email,
    origin: reservation.origin,
    startDate: reservation.startDate, endDate: reservation.endDate,
    roomType: reservation.roomType,
    numPeople: reservation.numPeople.toString(),
    roomNumber: reservation.roomNumber,
    paymentType: reservation.paymentType,
    anticipoPaid: reservation.anticipoPaid,
    comments: reservation.comments,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiUpdateReservation(reservation: {
  rowIndex: number; name: string; employee: string; phone: string;
  email: string; origin: string; date: string; roomType: string;
  numPeople: number; roomNumber: string; paymentType: string;
  anticipoPaid: string; status: string; comments: string;
}) {
  const data = await gasGet({
    action: 'updateReservation',
    rowIndex: reservation.rowIndex.toString(),
    name: reservation.name, employee: reservation.employee,
    phone: reservation.phone, email: reservation.email,
    origin: reservation.origin, date: reservation.date,
    roomType: reservation.roomType,
    numPeople: reservation.numPeople.toString(),
    roomNumber: reservation.roomNumber,
    paymentType: reservation.paymentType,
    anticipoPaid: reservation.anticipoPaid,
    status: reservation.status,
    comments: reservation.comments,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiBulkStatusUpdate(params: {
  name: string; roomNumber: string; registrationDate: string; newStatus: string;
}) {
  const data = await gasGet({
    action: 'bulkStatusUpdate',
    name: params.name, roomNumber: params.roomNumber,
    registrationDate: params.registrationDate, newStatus: params.newStatus,
  });
  return data || { error: 'Error de conexion' };
}

// Mark whole reservation as paid in full: sets anticipo=full total, payment method, checks in all nights
export async function apiBulkPaymentComplete(params: {
  name: string; roomNumber: string; registrationDate: string; method: string;
}) {
  const data = await gasGet({
    action: 'bulkPaymentComplete',
    name: params.name, roomNumber: params.roomNumber,
    registrationDate: params.registrationDate, method: params.method,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiDeleteReservation(rowIndex: number) {
  const data = await gasGet({ action: 'deleteReservation', rowIndex: rowIndex.toString() });
  return data || { error: 'Error de conexion' };
}

export async function apiGetPaymentLog(date: string) {
  const data = await gasGet({ action: 'getPaymentLog', date });
  return data?.payments || [];
}
