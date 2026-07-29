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

export async function apiLogin(password: string): Promise<{ success: boolean; role: string; label: string }> {
  const data = await gasGet({ action: 'login', password });
  return data || { success: false, role: '', label: '' };
}

export async function apiGetConfig() {
  const data = await gasGet({ action: 'getConfig' });
  return data || { rooms: [], prices: {} };
}

export async function apiGetReservations(startDate: string, endDate: string) {
  const data = await gasGet({ action: 'getReservations', startDate, endDate });
  return data?.reservations || [];
}

export async function apiGetAllReservations() {
  const data = await gasGet({ action: 'getAllReservations' });
  return data?.reservations || [];
}

export async function apiAddReservation(r: {
  name: string; employee: string; phone: string; email: string; origin: string;
  startDate: string; endDate: string; roomNumbers: string; numPeople: number;
  paymentType: string; anticipoPaid: string; comments: string; paidInFull: boolean;
  specialPrice: string; factura: boolean; cxc: boolean; entidad: string;
}) {
  const data = await gasGet({
    action: 'addReservation',
    name: r.name, employee: r.employee, phone: r.phone, email: r.email, origin: r.origin,
    startDate: r.startDate, endDate: r.endDate, roomNumbers: r.roomNumbers,
    numPeople: r.numPeople.toString(), paymentType: r.paymentType,
    anticipoPaid: r.anticipoPaid, comments: r.comments, paidInFull: r.paidInFull ? 'true' : 'false',
    specialPrice: r.specialPrice, factura: r.factura ? 'true' : 'false',
    cxc: r.cxc ? 'true' : 'false', entidad: r.entidad,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiMarkPaid(p: { reservationId: string; name: string; roomNumber: string; registrationDate: string; }) {
  const data = await gasGet({ action: 'markPaid', reservationId: p.reservationId, name: p.name, roomNumber: p.roomNumber, registrationDate: p.registrationDate });
  return data || { error: 'Error de conexion' };
}

export async function apiUpdateReservation(r: {
  rowIndex: number; name: string; employee: string; phone: string; email: string;
  origin: string; date: string; roomType: string; numPeople: number; roomNumber: string;
  paymentType: string; anticipoPaid: string; status: string; comments: string; checkout: string;
}) {
  const data = await gasGet({
    action: 'updateReservation', rowIndex: r.rowIndex.toString(),
    name: r.name, employee: r.employee, phone: r.phone, email: r.email, origin: r.origin,
    date: r.date, roomType: r.roomType, numPeople: r.numPeople.toString(), roomNumber: r.roomNumber,
    paymentType: r.paymentType, anticipoPaid: r.anticipoPaid, status: r.status, comments: r.comments, checkout: r.checkout,
  });
  return data || { error: 'Error de conexion' };
}

export async function apiBulkStatusUpdate(p: { reservationId: string; name: string; roomNumber: string; registrationDate: string; newStatus: string; }) {
  const data = await gasGet({ action: 'bulkStatusUpdate', reservationId: p.reservationId, name: p.name, roomNumber: p.roomNumber, registrationDate: p.registrationDate, newStatus: p.newStatus });
  return data || { error: 'Error de conexion' };
}

export async function apiBulkPaymentComplete(p: { reservationId: string; name: string; roomNumber: string; registrationDate: string; method: string; }) {
  const data = await gasGet({ action: 'bulkPaymentComplete', reservationId: p.reservationId, name: p.name, roomNumber: p.roomNumber, registrationDate: p.registrationDate, method: p.method });
  return data || { error: 'Error de conexion' };
}

export async function apiDeleteReservation(reservationId: string, name: string, roomNumber: string, registrationDate: string) {
  const data = await gasGet({ action: 'deleteReservation', reservationId, name, roomNumber, registrationDate });
  return data || { error: 'Error de conexion' };
}

export async function apiGetPaymentLog(date: string) {
  const data = await gasGet({ action: 'getPaymentLog', date });
  return data?.payments || [];
}

// Maintenance
export async function apiGetMaintenance() {
  const data = await gasGet({ action: 'getMaintenance' });
  return data?.items || [];
}
export async function apiAddMaintenance(room: string, description: string, createdBy: string) {
  const data = await gasGet({ action: 'addMaintenance', room, description, createdBy });
  return data || { error: 'Error de conexion' };
}
export async function apiResolveMaintenance(id: string) {
  const data = await gasGet({ action: 'resolveMaintenance', id });
  return data || { error: 'Error de conexion' };
}

// Config edits (admin)
export async function apiUpdatePrice(roomType: string, price: number) {
  const data = await gasGet({ action: 'updatePrice', roomType, price: price.toString() });
  return data || { error: 'Error de conexion' };
}
export async function apiAddRoom(num: string, roomType: string) {
  const data = await gasGet({ action: 'addRoom', num, roomType });
  return data || { error: 'Error de conexion' };
}
export async function apiDeleteRoom(num: string) {
  const data = await gasGet({ action: 'deleteRoom', num });
  return data || { error: 'Error de conexion' };
}
export async function apiBlockRoom(num: string, blocked: boolean, reason: string) {
  const data = await gasGet({ action: 'blockRoom', num, blocked: blocked ? 'true' : 'false', reason });
  return data || { error: 'Error de conexion' };
}
export async function apiUpdateRoomType(num: string, roomType: string) {
  const data = await gasGet({ action: 'updateRoomType', num, roomType });
  return data || { error: 'Error de conexion' };
}
export async function apiDeletePayment(rowIndex: number) {
  const data = await gasGet({ action: 'deletePayment', rowIndex: rowIndex.toString() });
  return data || { error: 'Error de conexion' };
}

// Users / passwords
export async function apiGetUsers() {
  const data = await gasGet({ action: 'getUsers' });
  return data?.users || [];
}
