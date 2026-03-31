// ============================================================
// UPDATE THIS URL after deploying your Google Apps Script
// ============================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzijjds_LtVyIm7R6_W7i5hgjwBhMA0uIQOk3byv2hmP5tfF2LD8FGYZMirFoG8lME2/exec';

export async function apiLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=login&password=${encodeURIComponent(password)}`);
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Login error:', err);
    return false;
  }
}

export async function apiGetReservations(startDate: string, endDate: string) {
  try {
    const res = await fetch(
      `${SCRIPT_URL}?action=getReservations&startDate=${startDate}&endDate=${endDate}`
    );
    const data = await res.json();
    return data.reservations || [];
  } catch (err) {
    console.error('Fetch reservations error:', err);
    return [];
  }
}

export async function apiAddReservation(reservation: {
  name: string;
  date: string;
  roomType: string;
  paymentType: string;
}) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=addReservation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Add reservation error:', err);
    return { error: 'Error de conexión' };
  }
}

export async function apiDeleteReservation(rowIndex: number) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=deleteReservation&rowIndex=${rowIndex}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Delete reservation error:', err);
    return { error: 'Error de conexión' };
  }
}

export async function apiGetAvailability(date: string) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getAvailability&date=${date}`);
    const data = await res.json();
    return data.availability || {};
  } catch (err) {
    console.error('Availability error:', err);
    return {};
  }
}
