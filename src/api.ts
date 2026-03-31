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
  date: string;
  roomType: string;
  paymentType: string;
}) {
  const data = await gasGet({
    action: 'addReservation',
    name: reservation.name,
    date: reservation.date,
    roomType: reservation.roomType,
    paymentType: reservation.paymentType,
  });
  return data || { error: 'Error de conexión' };
}

export async function apiDeleteReservation(rowIndex: number) {
  const data = await gasGet({ action: 'deleteReservation', rowIndex: rowIndex.toString() });
  return data || { error: 'Error de conexión' };
}

export async function apiGetAvailability(date: string) {
  const data = await gasGet({ action: 'getAvailability', date });
  return data?.availability || {};
}
