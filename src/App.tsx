import { useState, useEffect, useCallback } from 'react';
import {
  Reservation, RoomType, PaymentType, ReservationStatus,
  ROOM_TYPES, PAYMENT_TYPES, STATUSES, ROOM_PRICES, TOTAL_ROOMS,
  PEOPLE_OPTIONS, ROOM_MAP, DAY_NAMES,
} from './types';
import {
  apiLogin, apiGetReservations, apiAddReservation,
  apiUpdateReservation, apiDeleteReservation,
  apiBulkStatusUpdate, apiBulkPaymentUpdate, apiGetAllReservations,
} from './api';

/* ── helpers ── */
function getMonday(d: Date): Date {
  const date = new Date(d); const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0); return date;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function fmtDisp(s: string) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtMXN(n: number) { return `$${n.toLocaleString('es-MX')} MXN`; }
function weekDays(mon: Date) { return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function today() { return fmt(new Date()); }

function parseAnticipo(anticipo: string | boolean, price: number): number {
  if (!anticipo || anticipo === 'No' || anticipo === 'ninguno' || anticipo === false) return 0;
  const s = String(anticipo).trim();
  if (s.includes('%')) {
    const pct = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (!isNaN(pct)) return Math.round(price * pct / 100);
  }
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isNaN(num)) return num;
  return 0;
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/* ═══════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: (role: string) => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await apiLogin(pw);
    if (res.success) { sessionStorage.setItem('hotel_auth', res.role); onLogin(res.role); }
    else setErr('Contrasena incorrecta');
    setBusy(false);
  };
  return (
    <div className="login-container"><div className="login-bg-pattern" />
      <div className="login-card"><div className="login-header"><div className="login-icon">🏨</div><h1>Hotel Ancira</h1><p>Sistema de Gestion de Reservaciones</p></div>
        <form onSubmit={submit}><div className="input-group"><label>Contrasena</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Ingresa la contrasena" autoFocus /></div>
          {err && <div className="error-msg">{err}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={busy}>{busy ? 'Verificando...' : 'Ingresar'}</button></form></div></div>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR (Manager)
   ═══════════════════════════════════════════ */
function Sidebar({ reservations, selectedDate, onNew }: { reservations: Reservation[]; selectedDate: string; onNew: () => void }) {
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach(rt => (booked[rt] = 0));
  reservations.filter(r => r.date === selectedDate).forEach(r => { if (booked[r.roomType] !== undefined) booked[r.roomType]++; });
  const totalRes = Object.values(booked).reduce((a, b) => a + b, 0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a, b) => a + b, 0);
  return (
    <div className="sidebar">
      <button className="btn-primary btn-full btn-new-sidebar" onClick={onNew}>+ Nueva Reservacion</button>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Disponibilidad <span className="availability-date">{fmtDisp(selectedDate)}</span></div>
        <div className="availability-summary">
          <div className="summary-stat"><span className="stat-number">{totalRes}</span><span className="stat-label">Reservadas</span></div>
          <div className="summary-divider" />
          <div className="summary-stat"><span className="stat-number available">{totalRooms - totalRes}</span><span className="stat-label">Disponibles</span></div>
          <div className="summary-divider" />
          <div className="summary-stat"><span className="stat-number">{totalRooms}</span><span className="stat-label">Total</span></div>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Por Tipo</div>
        <div className="room-types-grid">
          {ROOM_TYPES.map(rt => {
            const avail = TOTAL_ROOMS[rt] - booked[rt]; const pct = (booked[rt] / TOTAL_ROOMS[rt]) * 100;
            return (<div key={rt} className="room-type-card"><div className="room-type-header"><span className="room-name">{rt}</span></div><div className="room-bar-container"><div className="room-bar-fill" style={{ width: `${pct}%` }} data-full={avail === 0 ? 'true' : 'false'} /></div><div className="room-type-stats"><span className={`room-available ${avail === 0 ? 'full' : ''}`}>{avail === 0 ? 'Lleno' : `${avail} disp.`}</span><span className="room-count">{booked[rt]}/{TOTAL_ROOMS[rt]}</span></div></div>);
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RESERVATION MODALS (same as v2)
   ═══════════════════════════════════════════ */
function NewReservationModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [name, setName] = useState(''); const [employee, setEmployee] = useState('');
  const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [numPeople, setNumPeople] = useState(PEOPLE_OPTIONS[ROOM_TYPES[0]][0]);
  const [roomNumber, setRoomNumber] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PAYMENT_TYPES[0]);
  const [anticipoPaid, setAnticipoPaid] = useState('');
  const [comments, setComments] = useState(''); const [saving, setSaving] = useState(false);
  const changeRoomType = (rt: RoomType) => { setRoomType(rt); if (!PEOPLE_OPTIONS[rt].includes(numPeople)) setNumPeople(PEOPLE_OPTIONS[rt][0]); };
  let nights = 0;
  if (startDate && endDate && endDate > startDate) { const s = new Date(startDate + 'T12:00:00'), e = new Date(endDate + 'T12:00:00'); nights = Math.round((e.getTime() - s.getTime()) / 86400000); }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim() || !employee.trim() || !startDate || !endDate) return;
    if (endDate <= startDate) { alert('La fecha de salida debe ser posterior a la de entrada'); return; }
    setSaving(true); await onSave({ name: name.trim(), employee: employee.trim(), phone: phone.trim(), email: email.trim(), origin: origin.trim(), startDate, endDate, roomType, numPeople, roomNumber: roomNumber.trim(), paymentType, anticipoPaid: anticipoPaid.trim(), comments: comments.trim() }); setSaving(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Nueva Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}>
        <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required autoFocus /></div>
        <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e => setEmployee(e.target.value)} placeholder="Nombre del empleado" required /></div>
        <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Numero de telefono" /></div>
        <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
        <div className="input-group"><label>De donde nos visita?</label><input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ciudad, estado o pais" /></div>
        <div className="input-group"><label>Numero de Cuarto</label>
          <select value={roomNumber} onChange={e => { setRoomNumber(e.target.value); const rm = ROOM_MAP.find(r => r.num.toString() === e.target.value); if (rm && rm.type !== roomType) changeRoomType(rm.type); }}>
            <option value="">Seleccionar cuarto</option>
            {ROOM_MAP.map(rm => (<option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>))}
          </select></div>
        <div className="form-row-2col">
          <div className="input-group"><label>Fecha de Entrada</label><input type="date" value={startDate} min={today()} required onChange={e => { setStartDate(e.target.value); if (!endDate || endDate <= e.target.value) { const next = new Date(e.target.value + 'T12:00:00'); next.setDate(next.getDate() + 1); setEndDate(fmt(next)); } }} /></div>
          <div className="input-group"><label>Fecha de Salida</label><input type="date" value={endDate} min={startDate ? fmt(addDays(new Date(startDate + 'T12:00:00'), 1)) : today()} required onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e => changeRoomType(e.target.value as RoomType)}>{ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt} - {fmtMXN(ROOM_PRICES[rt])}</option>)}</select></div>
        <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n => <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>)}</select></div>
        <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></div>
        <div className="input-group"><label>Anticipo</label><input type="text" value={anticipoPaid} onChange={e => setAnticipoPaid(e.target.value)} placeholder="Ej: $500, 50%, ninguno" /></div>
        <div className="input-group"><label>Comentarios</label><textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Notas adicionales..." rows={2} /></div>
        <div className="reservation-preview"><span>{nights} noche{nights !== 1 ? 's' : ''} x {fmtMXN(ROOM_PRICES[roomType])}</span><span className="preview-price">{fmtMXN(nights * ROOM_PRICES[roomType])}</span></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving || !name.trim() || !employee.trim() || !startDate || !endDate}>{saving ? 'Guardando...' : 'Guardar Reservacion'}</button></div>
      </form></div></div>
  );
}

function EditReservationModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: any) => void; initial: Reservation }) {
  const [name, setName] = useState(initial.name); const [employee, setEmployee] = useState(initial.employee);
  const [phone, setPhone] = useState(initial.phone); const [email, setEmail] = useState(initial.email);
  const [origin, setOrigin] = useState(initial.origin || ''); const [date, setDate] = useState(initial.date);
  const [roomType, setRoomType] = useState<RoomType>(initial.roomType);
  const [numPeople, setNumPeople] = useState(initial.numPeople);
  const [roomNumber, setRoomNumber] = useState(initial.roomNumber);
  const [paymentType, setPaymentType] = useState<PaymentType>(initial.paymentType);
  const [anticipoPaid, setAnticipoPaid] = useState(String(initial.anticipoPaid || ''));
  const [status, setStatus] = useState<ReservationStatus>(initial.status);
  const [comments, setComments] = useState(initial.comments || ''); const [saving, setSaving] = useState(false);
  const changeRoomType = (rt: RoomType) => { setRoomType(rt); if (!PEOPLE_OPTIONS[rt].includes(numPeople)) setNumPeople(PEOPLE_OPTIONS[rt][0]); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim() || !employee.trim() || !date) return; setSaving(true); await onSave({ name: name.trim(), employee: employee.trim(), phone: phone.trim(), email: email.trim(), origin: origin.trim(), date, roomType, numPeople, roomNumber: roomNumber.trim(), paymentType, anticipoPaid: anticipoPaid.trim(), status, comments: comments.trim() }); setSaving(false); };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Editar Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}>
        <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus /></div>
        <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e => setEmployee(e.target.value)} required /></div>
        <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="input-group"><label>De donde nos visita?</label><input type="text" value={origin} onChange={e => setOrigin(e.target.value)} /></div>
        <div className="input-group"><label>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
        <div className="input-group"><label>Numero de Cuarto</label><select value={roomNumber} onChange={e => { setRoomNumber(e.target.value); const rm = ROOM_MAP.find(r => r.num.toString() === e.target.value); if (rm && rm.type !== roomType) changeRoomType(rm.type); }}><option value="">Seleccionar cuarto</option>{ROOM_MAP.map(rm => <option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>)}</select></div>
        <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e => changeRoomType(e.target.value as RoomType)}>{ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt} - {fmtMXN(ROOM_PRICES[rt])}</option>)}</select></div>
        <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n => <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>)}</select></div>
        <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></div>
        <div className="input-group"><label>Estado</label><select value={status} onChange={e => setStatus(e.target.value as ReservationStatus)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="input-group"><label>Anticipo</label><input type="text" value={anticipoPaid} onChange={e => setAnticipoPaid(e.target.value)} placeholder="Ej: $500, 50%, ninguno" /></div>
        <div className="input-group"><label>Comentarios</label><textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Notas adicionales..." rows={2} /></div>
        <div className="reservation-preview"><span>Total:</span><span className="preview-price">{fmtMXN(ROOM_PRICES[roomType])}</span></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving || !name.trim() || !employee.trim() || !date}>{saving ? 'Guardando...' : 'Actualizar'}</button></div>
      </form></div></div>
  );
}

/* ── DETAIL MODAL (shows remaining to pay) ── */
function DetailModal({ r, onClose, onEdit, onDelete, onStatus, onPayment }: {
  r: Reservation; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onStatus: (s: ReservationStatus) => void; onPayment: (p: PaymentType) => void;
}) {
  const [busy1, setBusy1] = useState(false); const [busy2, setBusy2] = useState(false);
  const next: ReservationStatus = r.status === 'Reserva' ? 'Check-in' : 'Reserva';
  const isPF = r.paymentType === 'Pago Faltante';
  const antic = parseAnticipo(r.anticipoPaid, r.price);
  const remaining = r.price - antic;
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Detalle de Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="detail-status-row">
        <div className={`detail-status-badge status-${r.status.toLowerCase().replace('-', '')}`}>{r.status}</div>
        <button className="btn-status-toggle" disabled={busy1} onClick={async () => { setBusy1(true); await onStatus(next); setBusy1(false); }}>{busy1 ? 'Cambiando...' : `Cambiar a ${next}`}</button>
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Nombre</span><span className="detail-value">{r.name}</span></div>
        <div className="detail-row"><span className="detail-label">Empleado</span><span className="detail-value">{r.employee}</span></div>
        <div className="detail-row"><span className="detail-label">Telefono</span><span className="detail-value">{r.phone || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{r.email || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Origen</span><span className="detail-value">{r.origin || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Fecha</span><span className="detail-value">{fmtDisp(r.date)}</span></div>
        <div className="detail-row"><span className="detail-label">Habitacion</span><span className="detail-value">{r.roomType}</span></div>
        <div className="detail-row"><span className="detail-label">Cuarto #</span><span className="detail-value">{r.roomNumber || 'No asignado'}</span></div>
        <div className="detail-row"><span className="detail-label">Personas</span><span className="detail-value">{r.numPeople}</span></div>
        <div className="detail-row"><span className="detail-label">Anticipo</span><span className="detail-value">{r.anticipoPaid || 'Ninguno'}</span></div>
        <div className="detail-row"><span className="detail-label">Precio por noche</span><span className="detail-value detail-price">{fmtMXN(r.price)}</span></div>
        <div className="detail-row"><span className="detail-label">Restante por cobrar</span><span className={`detail-value ${remaining > 0 ? 'detail-remaining' : 'detail-paid'}`}>{remaining > 0 ? fmtMXN(remaining) : 'Pagado'}</span></div>
        <div className="detail-row full-width"><span className="detail-label">Comentarios</span><span className="detail-value">{r.comments || 'Sin comentarios'}</span></div>
      </div>
      <div className="detail-payment-row">
        <span className="detail-label">Pago: <strong>{r.paymentType}</strong></span>
        {isPF && <div className="payment-change-buttons">
          <button className="btn-payment-change tarjeta" disabled={busy2} onClick={async () => { setBusy2(true); await onPayment('Tarjeta'); setBusy2(false); }}>Cambiar a Tarjeta</button>
          <button className="btn-payment-change efectivo" disabled={busy2} onClick={async () => { setBusy2(true); await onPayment('Efectivo'); setBusy2(false); }}>Cambiar a Efectivo</button>
        </div>}
      </div>
      <div className="modal-actions"><button className="btn-danger" onClick={onDelete}>Eliminar</button><button className="btn-primary" onClick={onEdit}>Editar</button></div>
    </div></div>
  );
}

/* ═══════════════════════════════════════════
   WEEK VIEW (Manager - no money totals in header)
   ═══════════════════════════════════════════ */
function WeekView({ reservations, weekStart, onWeekChange, onSelectDate, selectedDate, onClick, onJump }: {
  reservations: Reservation[]; weekStart: Date; onWeekChange: (d: number) => void;
  onSelectDate: (d: string) => void; selectedDate: string;
  onClick: (r: Reservation) => void; onJump: (d: string) => void;
}) {
  const days = weekDays(weekStart); const todayStr = today();
  const byDate: Record<string, Reservation[]> = {};
  days.forEach(d => { byDate[fmt(d)] = reservations.filter(r => r.date === fmt(d)); });
  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-nav" onClick={() => onWeekChange(-1)}>←</button>
        <div className="week-nav-center">
          <h2 className="week-label">{fmtDisp(fmt(days[0]))} — {fmtDisp(fmt(days[6]))}</h2>
          <input type="date" className="week-date-picker" value={fmt(weekStart)} onChange={e => { if (e.target.value) onJump(e.target.value); }} />
        </div>
        <button className="btn-nav" onClick={() => onWeekChange(1)}>→</button>
      </div>
      <div className="week-grid-rooms">
        {days.map(d => {
          const ds = fmt(d); const dayRes = byDate[ds] || [];
          const isToday = ds === todayStr; const isSel = ds === selectedDate;
          const map: Record<string, Reservation> = {};
          dayRes.forEach(r => { if (r.roomNumber) map[r.roomNumber] = r; });
          return (
            <div key={ds} className={`day-col ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`} onClick={() => onSelectDate(ds)}>
              <div className="day-col-header">
                {isToday && <span className="today-badge">Hoy</span>}
                <span className="day-name">{DAY_NAMES[d.getDay()]}</span>
                <span className="day-date-num">{d.getDate()}</span>
                <div className="day-col-stats"><span>{dayRes.length} reservaciones</span></div>
              </div>
              {ROOM_MAP.map(rm => {
                const res = map[rm.num.toString()];
                if (res) return (
                  <div key={rm.num} className={`room-cell occupied payment-${res.paymentType.toLowerCase().replace(' ', '-')} status-${res.status.toLowerCase().replace('-', '')}`} onClick={e => { e.stopPropagation(); onClick(res); }}>
                    <div className="room-cell-top"><span className="room-cell-num">{rm.num}</span><span className={`chip-status-dot status-${res.status.toLowerCase().replace('-', '')}`} /></div>
                    <span className="room-cell-name">{res.name}</span>
                  </div>);
                return (<div key={rm.num} className="room-cell empty"><span className="room-cell-num">{rm.num}</span></div>);
              })}
            </div>);
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MANAGER DASHBOARD
   ═══════════════════════════════════════════ */
function ManagerDashboard({ onLogout }: { onLogout: () => void }) {
  const [reservations, setRes] = useState<Reservation[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(today());
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [edit, setEdit] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const flash = (m: string, t: 'success' | 'error' = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => { setLoading(true); setRes(await apiGetReservations(fmt(weekStart), fmt(addDays(weekStart, 6)))); setLoading(false); }, [weekStart]);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: any) => { const r = await apiAddReservation(data); if (r.success) { flash(`Reservacion guardada (${r.daysCreated} noche${r.daysCreated !== 1 ? 's' : ''})`); setShowNew(false); load(); } else flash(r.error || 'Error', 'error'); };
  const handleUpdate = async (data: any) => { if (!edit?.rowIndex) return; const r = await apiUpdateReservation({ ...data, rowIndex: edit.rowIndex }); if (r.success) { flash('Actualizada'); setEdit(null); load(); } else flash(r.error || 'Error', 'error'); };
  const handleDelete = async (r: Reservation) => { if (!confirm(`Eliminar reservacion de ${r.name}?`)) return; if (!r.rowIndex) return; const res = await apiDeleteReservation(r.rowIndex); if (res.success) { flash('Eliminada'); setDetail(null); load(); } else flash('Error', 'error'); };
  const bulkStatus = async (r: Reservation, ns: ReservationStatus) => { const res = await apiBulkStatusUpdate({ name: r.name, roomNumber: r.roomNumber, registrationDate: r.registrationDate, newStatus: ns }); if (res.success) { flash(`${ns} aplicado`); setDetail(null); load(); } else flash('Error', 'error'); };
  const bulkPayment = async (r: Reservation, np: PaymentType) => { const res = await apiBulkPaymentUpdate({ name: r.name, roomNumber: r.roomNumber, registrationDate: r.registrationDate, newPaymentType: np }); if (res.success) { flash('Pago actualizado'); setDetail(null); load(); } else flash('Error', 'error'); };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira</h1></div>
        <div className="header-center"><div className="week-summary"><div className="summary-item"><span className="summary-value">{reservations.length}</span><span className="summary-label">Reservaciones esta semana</span></div></div></div>
        <div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div>
      </header>
      <main className="dashboard-body">
        <Sidebar reservations={reservations} selectedDate={selectedDate} onNew={() => setShowNew(true)} />
        <div className="main-content">
          {loading ? <div className="loading-state"><div className="spinner" /><p>Cargando...</p></div> :
            <WeekView reservations={reservations} weekStart={weekStart} onWeekChange={dir => setWeekStart(prev => addDays(prev, dir * 7))} onSelectDate={setSelectedDate} selectedDate={selectedDate} onClick={setDetail} onJump={ds => setWeekStart(getMonday(new Date(ds + 'T12:00:00')))} />}
        </div>
      </main>
      {showNew && <NewReservationModal onClose={() => setShowNew(false)} onSave={handleAdd} />}
      {edit && <EditReservationModal onClose={() => setEdit(null)} onSave={handleUpdate} initial={edit} />}
      {detail && !edit && <DetailModal r={detail} onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null); }} onDelete={() => handleDelete(detail)} onStatus={async ns => bulkStatus(detail, ns)} onPayment={async np => bulkPayment(detail, np)} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════ */
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [allRes, setAllRes] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });

  useEffect(() => {
    (async () => { setLoading(true); setAllRes(await apiGetAllReservations()); setLoading(false); })();
  }, []);

  if (loading) return (
    <div className="dashboard"><header className="dashboard-header"><div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira — Admin</h1></div><div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div></header>
      <div className="loading-state"><div className="spinner" /><p>Cargando datos...</p></div></div>
  );

  const todayStr = today();
  const todayRes = allRes.filter(r => r.date === todayStr);
  const todayTotal = todayRes.reduce((s, r) => s + r.price, 0);
  const todayTarjeta = todayRes.filter(r => r.paymentType === 'Tarjeta').reduce((s, r) => s + r.price, 0);
  const todayEfectivo = todayRes.filter(r => r.paymentType === 'Efectivo').reduce((s, r) => s + r.price, 0);
  const todayPF = todayRes.filter(r => r.paymentType === 'Pago Faltante').reduce((s, r) => s + r.price, 0);

  // This week
  const mon = getMonday(new Date());
  const sun = addDays(mon, 6);
  const weekRes = allRes.filter(r => r.date >= fmt(mon) && r.date <= fmt(sun));
  const weekTotal = weekRes.reduce((s, r) => s + r.price, 0);
  const weekTarjeta = weekRes.filter(r => r.paymentType === 'Tarjeta').reduce((s, r) => s + r.price, 0);
  const weekEfectivo = weekRes.filter(r => r.paymentType === 'Efectivo').reduce((s, r) => s + r.price, 0);

  // This month
  const monthStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;
  const monthRes = allRes.filter(r => r.date.startsWith(monthStr));
  const monthTotal = monthRes.reduce((s, r) => s + r.price, 0);
  const monthCount = monthRes.length;

  // Most booked rooms
  const roomCounts: Record<string, number> = {};
  allRes.forEach(r => { if (r.roomNumber) roomCounts[r.roomNumber] = (roomCounts[r.roomNumber] || 0) + 1; });
  const topRooms = Object.entries(roomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Calendar
  const calFirst = new Date(viewMonth.year, viewMonth.month, 1);
  const calLast = new Date(viewMonth.year, viewMonth.month + 1, 0);
  const startDay = calFirst.getDay();
  const daysInMonth = calLast.getDate();
  const resByDate: Record<string, number> = {};
  monthRes.forEach(r => { resByDate[r.date] = (resByDate[r.date] || 0) + 1; });

  const calCells = [];
  for (let i = 0; i < startDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calCells.push({ day: d, count: resByDate[ds] || 0, date: ds });
  }

  const prevMonth = () => {
    setViewMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira — Admin</h1></div>
        <div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div>
      </header>
      <div className="admin-body">
        {/* Row 1: Today + This Week */}
        <div className="admin-row">
          <div className="admin-card">
            <h3>Hoy — {fmtDisp(todayStr)}</h3>
            <div className="admin-stat-row"><span>Reservaciones</span><strong>{todayRes.length}</strong></div>
            <div className="admin-stat-row"><span>Total</span><strong className="text-success">{fmtMXN(todayTotal)}</strong></div>
            <div className="admin-stat-row"><span>Tarjeta</span><strong>{fmtMXN(todayTarjeta)}</strong></div>
            <div className="admin-stat-row"><span>Efectivo</span><strong>{fmtMXN(todayEfectivo)}</strong></div>
            <div className="admin-stat-row"><span>Pago Faltante</span><strong className="text-danger">{fmtMXN(todayPF)}</strong></div>
          </div>
          <div className="admin-card">
            <h3>Esta Semana</h3>
            <div className="admin-stat-row"><span>Reservaciones</span><strong>{weekRes.length}</strong></div>
            <div className="admin-stat-row"><span>Total</span><strong className="text-success">{fmtMXN(weekTotal)}</strong></div>
            <div className="admin-stat-row"><span>Tarjeta</span><strong>{fmtMXN(weekTarjeta)}</strong></div>
            <div className="admin-stat-row"><span>Efectivo</span><strong>{fmtMXN(weekEfectivo)}</strong></div>
          </div>
          <div className="admin-card">
            <h3>Cuartos Mas Reservados</h3>
            {topRooms.length === 0 ? <p className="text-muted">Sin datos</p> :
              topRooms.map(([room, count]) => {
                const rm = ROOM_MAP.find(r => r.num.toString() === room);
                return (<div key={room} className="admin-stat-row"><span>Cuarto {room} {rm ? `(${rm.typeShort})` : ''}</span><strong>{count} noches</strong></div>);
              })}
          </div>
        </div>

        {/* Row 2: Month summary + Calendar */}
        <div className="admin-row">
          <div className="admin-card">
            <h3>{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3>
            <div className="admin-stat-row"><span>Total Reservaciones</span><strong>{monthCount}</strong></div>
            <div className="admin-stat-row"><span>Ingreso Total</span><strong className="text-success">{fmtMXN(monthTotal)}</strong></div>
          </div>
          <div className="admin-card admin-card-wide">
            <div className="cal-header">
              <button className="btn-nav" onClick={prevMonth}>←</button>
              <h3>{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3>
              <button className="btn-nav" onClick={nextMonth}>→</button>
            </div>
            <div className="cal-grid">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
              {calCells.map((cell, i) => {
                if (!cell) return <div key={`e${i}`} className="cal-cell cal-empty" />;
                const hasRes = cell.count > 0;
                const isToday = cell.date === todayStr;
                return (
                  <div key={cell.date} className={`cal-cell ${hasRes ? 'cal-has-res' : ''} ${isToday ? 'cal-today' : ''}`}>
                    <span className="cal-num">{cell.day}</span>
                    {hasRes && <span className="cal-count">{cell.count}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Daily breakdown for the month */}
        <div className="admin-row">
          <div className="admin-card admin-card-full">
            <h3>Desglose Diario — {MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Fecha</th><th>Reservaciones</th><th>Tarjeta</th><th>Efectivo</th><th>Pago Faltante</th><th>Total</th></tr></thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const ds = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                    const dRes = allRes.filter(r => r.date === ds);
                    if (dRes.length === 0) return null;
                    const dTarj = dRes.filter(r => r.paymentType === 'Tarjeta').reduce((s, r) => s + r.price, 0);
                    const dEfec = dRes.filter(r => r.paymentType === 'Efectivo').reduce((s, r) => s + r.price, 0);
                    const dPF = dRes.filter(r => r.paymentType === 'Pago Faltante').reduce((s, r) => s + r.price, 0);
                    return (<tr key={ds}><td>{fmtDisp(ds)}</td><td>{dRes.length}</td><td>{fmtMXN(dTarj)}</td><td>{fmtMXN(dEfec)}</td><td className="text-danger">{fmtMXN(dPF)}</td><td className="text-success"><strong>{fmtMXN(dTarj + dEfec + dPF)}</strong></td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════ */
export default function App() {
  const [role, setRole] = useState<string | null>(() => sessionStorage.getItem('hotel_auth'));

  const handleLogout = () => { sessionStorage.removeItem('hotel_auth'); setRole(null); };

  if (!role) return <LoginScreen onLogin={(r) => setRole(r)} />;
  if (role === 'admin') return <AdminDashboard onLogout={handleLogout} />;
  return <ManagerDashboard onLogout={handleLogout} />;
}
