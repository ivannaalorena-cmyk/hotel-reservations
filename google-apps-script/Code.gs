// ============================================================
// HOTEL RESERVAS - Google Apps Script Backend
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://script.google.com and create a new project
// 2. Paste this entire file into Code.gs
// 3. Create a Google Sheet and copy its ID from the URL
// 4. Update SHEET_ID below with your Google Sheet ID
// 5. Deploy as Web App (Execute as: Me, Access: Anyone)
// 6. Set up time-based triggers (see bottom of file)
// ============================================================

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const NOTIFICATION_EMAIL = 'ivannaalorena@gmail.com';
const SHEET_NAME = 'Reservaciones';
const PASSWORD = 'hotel2026'; // Change this to your desired password

// Room prices in MXN
const PRICES = {
  '1 Cama Matrimonial': 900,
  '1 Cama King Size': 1100,
  '2 Camas Matrimoniales': 1500,
  '2 Camas King Size': 1700
};

// Total rooms per type
const TOTAL_ROOMS = {
  '1 Cama Matrimonial': 3,
  '1 Cama King Size': 4,
  '2 Camas Matrimoniales': 10,
  '2 Camas King Size': 2
};

// ---- CORS & Routing ----

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'login':
        result = handleLogin(e.parameter.password);
        break;
      case 'getReservations':
        result = getReservations(e.parameter.startDate, e.parameter.endDate);
        break;
      case 'addReservation':
        const data = JSON.parse(e.postData.contents);
        result = addReservation(data);
        break;
      case 'deleteReservation':
        result = deleteReservation(e.parameter.rowIndex);
        break;
      case 'getAvailability':
        result = getAvailability(e.parameter.date);
        break;
      default:
        result = { error: 'Acción no válida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Authentication ----

function handleLogin(password) {
  return { success: password === PASSWORD };
}

// ---- Sheet Helpers ----

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Nombre', 'Fecha', 'Tipo de Habitación', 'Tipo de Pago', 'Precio', 'Fecha de Registro']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

// ---- CRUD Operations ----

function addReservation(data) {
  const sheet = getSheet();
  const id = Utilities.getUuid().substring(0, 8);
  const price = PRICES[data.roomType] || 0;
  const now = new Date();
  const registrationDate = Utilities.formatDate(now, 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss');

  sheet.appendRow([
    id,
    data.name,
    data.date,
    data.roomType,
    data.paymentType,
    price,
    registrationDate
  ]);

  // Send notification email
  sendNewReservationNotification(data, price, id);

  return {
    success: true,
    reservation: {
      id: id,
      name: data.name,
      date: data.date,
      roomType: data.roomType,
      paymentType: data.paymentType,
      price: price,
      registrationDate: registrationDate
    }
  };
}

function getReservations(startDate, endDate) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return { reservations: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const reservations = [];

  for (let i = 0; i < data.length; i++) {
    const resDate = data[i][2];
    if ((!startDate || resDate >= startDate) && (!endDate || resDate <= endDate)) {
      reservations.push({
        id: data[i][0],
        name: data[i][1],
        date: data[i][2],
        roomType: data[i][3],
        paymentType: data[i][4],
        price: data[i][5],
        registrationDate: data[i][6],
        rowIndex: i + 2
      });
    }
  }

  return { reservations: reservations };
}

function deleteReservation(rowIndex) {
  const sheet = getSheet();
  const row = parseInt(rowIndex);
  if (row < 2) return { error: 'Índice inválido' };
  sheet.deleteRow(row);
  return { success: true };
}

function getAvailability(date) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const booked = {
    '1 Cama Matrimonial': 0,
    '1 Cama King Size': 0,
    '2 Camas Matrimoniales': 0,
    '2 Camas King Size': 0
  };

  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][2] === date && booked.hasOwnProperty(data[i][3])) {
        booked[data[i][3]]++;
      }
    }
  }

  const availability = {};
  for (const type in TOTAL_ROOMS) {
    availability[type] = {
      total: TOTAL_ROOMS[type],
      booked: booked[type],
      available: TOTAL_ROOMS[type] - booked[type]
    };
  }

  return { availability: availability, date: date };
}

// ---- Email Notifications ----

function sendNewReservationNotification(data, price, id) {
  const subject = '🏨 Nueva Reservación - ' + data.name;
  const body = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf7f2; padding: 30px; border-radius: 12px;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #c4956a; padding-bottom: 10px;">Nueva Reservación Registrada</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr><td style="padding: 8px 0; color: #666; width: 160px;">ID Reservación:</td><td style="padding: 8px 0; font-weight: bold;">${id}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Nombre:</td><td style="padding: 8px 0; font-weight: bold;">${data.name}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Fecha:</td><td style="padding: 8px 0; font-weight: bold;">${data.date}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Tipo de Habitación:</td><td style="padding: 8px 0; font-weight: bold;">${data.roomType}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Tipo de Pago:</td><td style="padding: 8px 0; font-weight: bold;">${data.paymentType}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Precio:</td><td style="padding: 8px 0; font-weight: bold; color: #2d6a4f;">$${price.toLocaleString()} MXN</td></tr>
      </table>
    </div>
  `;

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    htmlBody: body
  });
}

// ---- Thursday Report (Fri-Sat-Sun Preview) ----
// Set trigger: Every Thursday at desired time

function sendThursdayReport() {
  const today = new Date();
  const friday = getNextDay(today, 5);   // Friday
  const saturday = getNextDay(today, 6); // Saturday
  const sunday = getNextDay(today, 0);   // Sunday

  // If today is Thursday, get the upcoming Fri/Sat/Sun
  const friStr = formatDateStr(friday);
  const satStr = formatDateStr(saturday);
  const sunStr = formatDateStr(addDays(friday, 2));

  const days = [
    { label: 'Viernes ' + friStr, date: friStr },
    { label: 'Sábado ' + satStr, date: satStr },
    { label: 'Domingo ' + formatDateStr(addDays(friday, 2)), date: formatDateStr(addDays(friday, 2)) }
  ];

  // Recalculate: get next Friday from Thursday
  const thu = new Date();
  const daysUntilFri = (5 - thu.getDay() + 7) % 7 || 7;
  const fri = new Date(thu);
  fri.setDate(thu.getDate() + (daysUntilFri === 0 ? 1 : daysUntilFri));
  const sat = addDays(fri, 1);
  const sun = addDays(fri, 2);

  const daysList = [
    { label: 'Viernes', date: formatDateStr(fri) },
    { label: 'Sábado', date: formatDateStr(sat) },
    { label: 'Domingo', date: formatDateStr(sun) }
  ];

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  let allData = [];
  if (lastRow >= 2) {
    allData = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  }

  let totalWeekend = 0;
  let tableRows = '';

  for (const day of daysList) {
    const dayReservations = allData.filter(r => r[2] === day.date);
    const dayTotal = dayReservations.reduce((sum, r) => sum + (Number(r[5]) || 0), 0);
    totalWeekend += dayTotal;

    tableRows += `
      <tr style="background: #f0ebe3;">
        <td colspan="5" style="padding: 12px; font-weight: bold; color: #1a365d; font-size: 16px;">${day.label} - ${day.date}</td>
      </tr>
    `;

    if (dayReservations.length === 0) {
      tableRows += `<tr><td colspan="5" style="padding: 8px 12px; color: #999; font-style: italic;">Sin reservaciones</td></tr>`;
    } else {
      for (const r of dayReservations) {
        tableRows += `
          <tr>
            <td style="padding: 6px 12px;">${r[1]}</td>
            <td style="padding: 6px 12px;">${r[3]}</td>
            <td style="padding: 6px 12px;">${r[4]}</td>
            <td style="padding: 6px 12px; text-align: right;">$${Number(r[5]).toLocaleString()} MXN</td>
          </tr>
        `;
      }
      tableRows += `
        <tr style="border-top: 1px solid #ddd;">
          <td colspan="3" style="padding: 6px 12px; text-align: right; font-weight: bold;">Subtotal ${day.label}:</td>
          <td style="padding: 6px 12px; text-align: right; font-weight: bold; color: #2d6a4f;">$${dayTotal.toLocaleString()} MXN</td>
        </tr>
      `;
    }
  }

  const subject = '📊 Reporte de Fin de Semana - ' + formatDateStr(fri) + ' al ' + formatDateStr(sun);
  const body = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #faf7f2; padding: 30px; border-radius: 12px;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #c4956a; padding-bottom: 10px;">Resumen de Reservaciones - Fin de Semana</h2>
      <p style="color: #666;">Reservaciones para viernes, sábado y domingo próximos.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        ${tableRows}
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #1a365d; color: white; border-radius: 8px; text-align: center; font-size: 18px;">
        <strong>Total Fin de Semana: $${totalWeekend.toLocaleString()} MXN</strong>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    htmlBody: body
  });
}

// ---- Sunday Report (Past Week Recap) ----
// Set trigger: Every Sunday at 5:00 PM (Mexico City time)

function sendSundayReport() {
  const today = new Date();
  const weekAgo = addDays(today, -6);

  const startStr = formatDateStr(weekAgo);
  const endStr = formatDateStr(today);

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  let allData = [];
  if (lastRow >= 2) {
    allData = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  }

  const weekReservations = allData.filter(r => r[2] >= startStr && r[2] <= endStr);

  let totalTarjeta = 0;
  let totalEfectivo = 0;
  let totalPagoFaltante = 0;
  let tableRows = '';

  for (const r of weekReservations) {
    const price = Number(r[5]) || 0;
    if (r[4] === 'Tarjeta') totalTarjeta += price;
    else if (r[4] === 'Efectivo') totalEfectivo += price;
    else if (r[4] === 'Pago Faltante') totalPagoFaltante += price;

    tableRows += `
      <tr>
        <td style="padding: 6px 12px;">${r[2]}</td>
        <td style="padding: 6px 12px;">${r[1]}</td>
        <td style="padding: 6px 12px;">${r[3]}</td>
        <td style="padding: 6px 12px;">${r[4]}</td>
        <td style="padding: 6px 12px; text-align: right;">$${price.toLocaleString()} MXN</td>
      </tr>
    `;
  }

  const grandTotal = totalTarjeta + totalEfectivo + totalPagoFaltante;

  const subject = '📋 Resumen Semanal - ' + startStr + ' al ' + endStr;
  const body = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #faf7f2; padding: 30px; border-radius: 12px;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #c4956a; padding-bottom: 10px;">Resumen Semanal de Reservaciones</h2>
      <p style="color: #666;">Período: ${startStr} al ${endStr} | Total reservaciones: ${weekReservations.length}</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
        <tr style="background: #1a365d; color: white;">
          <th style="padding: 10px 12px; text-align: left;">Fecha</th>
          <th style="padding: 10px 12px; text-align: left;">Nombre</th>
          <th style="padding: 10px 12px; text-align: left;">Habitación</th>
          <th style="padding: 10px 12px; text-align: left;">Pago</th>
          <th style="padding: 10px 12px; text-align: right;">Precio</th>
        </tr>
        ${tableRows || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #999;">Sin reservaciones esta semana</td></tr>'}
      </table>

      <div style="margin-top: 25px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #e2d5c3;">
        <h3 style="color: #1a365d; margin-top: 0;">Desglose por Tipo de Pago</h3>
        <table style="width: 100%; font-size: 15px;">
          <tr>
            <td style="padding: 8px 0;">💳 Tarjeta:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">$${totalTarjeta.toLocaleString()} MXN</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">💵 Efectivo:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">$${totalEfectivo.toLocaleString()} MXN</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">⏳ Pago Faltante:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #c53030;">$${totalPagoFaltante.toLocaleString()} MXN</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 15px; padding: 15px; background: #1a365d; color: white; border-radius: 8px; text-align: center; font-size: 18px;">
        <strong>Total Semanal: $${grandTotal.toLocaleString()} MXN</strong>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: subject,
    htmlBody: body
  });
}

// ---- Utility Functions ----

function formatDateStr(date) {
  return Utilities.formatDate(date, 'America/Mexico_City', 'yyyy-MM-dd');
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getNextDay(fromDate, dayOfWeek) {
  const result = new Date(fromDate);
  const diff = (dayOfWeek - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + (diff === 0 ? 7 : diff));
  return result;
}

// ============================================================
// TRIGGER SETUP - Run this function ONCE manually to set up
// automated email reports
// ============================================================
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  // Thursday report - every Thursday at 9:00 AM Mexico City time
  ScriptApp.newTrigger('sendThursdayReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY)
    .atHour(9)
    .inTimezone('America/Mexico_City')
    .create();

  // Sunday report - every Sunday at 5:00 PM Mexico City time
  ScriptApp.newTrigger('sendSundayReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(17)
    .inTimezone('America/Mexico_City')
    .create();

  Logger.log('Triggers created successfully!');
}
