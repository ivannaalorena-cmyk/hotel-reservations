import { useState, useEffect, useCallback } from 'react';
import {
  Reservation, RoomType, PaymentType, ReservationStatus, RoomDef, MaintenanceItem, UserAccess,
  ROOM_TYPES, PAYMENT_TYPES, STATUSES, PEOPLE_OPTIONS, DEFAULT_ROOMS, DEFAULT_PRICES, DAY_NAMES,
} from './types';
import {
  apiLogin, apiGetConfig, apiGetReservations, apiAddReservation, apiUpdateReservation,
  apiDeleteReservation, apiBulkStatusUpdate, apiBulkPaymentComplete, apiGetAllReservations,
  apiGetPaymentLog, apiGetMaintenance, apiAddMaintenance, apiResolveMaintenance,
  apiUpdatePrice, apiAddRoom, apiDeleteRoom, apiBlockRoom, apiGetUsers,
} from './api';

interface PaymentLogEntry { timestamp: string; name: string; room: string; method: string; amount: number; registrationDate: string; }
interface Config { rooms: RoomDef[]; prices: Record<string, number>; }

function getMonday(d: Date): Date { const date = new Date(d); const day = date.getDay(); date.setDate(date.getDate() - day + (day === 0 ? -6 : 1)); date.setHours(0, 0, 0, 0); return date; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function fmtDisp(s: string) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtMXN(n: number) { return `$${n.toLocaleString('es-MX')} MXN`; }
function weekDays(mon: Date) { return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function today() { return fmt(new Date()); }

function parseAnticipo(anticipo: string, totalPrice: number): number {
  if (!anticipo || anticipo === 'No' || anticipo === 'ninguno' || anticipo === 'false') return 0;
  const s = String(anticipo).trim();
  if (s.includes('%')) { const pct = parseFloat(s.replace(/[^0-9.]/g, '')); if (!isNaN(pct)) return Math.round(totalPrice * pct / 100); }
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isNaN(num)) return num;
  return 0;
}

function groupKey(r: Reservation): string { return r.reservationId ? 'RID:' + r.reservationId : `${r.name}||${r.roomNumber}||${r.registrationDate}`; }
function getGroup(r: Reservation, all: Reservation[]): Reservation[] { const k = groupKey(r); return all.filter(x => groupKey(x) === k); }
function getGroupTotal(r: Reservation, all: Reservation[]): number { return getGroup(r, all).reduce((s, x) => s + Number(x.price), 0); }
function getGroupRemaining(r: Reservation, all: Reservation[]): number { const t = getGroupTotal(r, all); return Math.max(0, t - parseAnticipo(r.anticipoPaid, t)); }
function getResColor(r: Reservation, all: Reservation[]): 'orange' | 'blue' | 'green' {
  const t = getGroupTotal(r, all); const remaining = Math.max(0, t - parseAnticipo(r.anticipoPaid, t));
  if (remaining === 0) return 'green';
  if (parseAnticipo(r.anticipoPaid, t) > 0) return 'blue';
  return 'orange';
}
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/* ═══════ LOGIN ═══════ */
function LoginScreen({ onLogin }: { onLogin: (role: string) => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
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

/* ═══════ MANAGER SIDEBAR ═══════ */
function ManagerSidebar({ reservations, rooms, selectedDate, onNew, onReport }: { reservations: Reservation[]; rooms: RoomDef[]; selectedDate: string; onNew: () => void; onReport: () => void }) {
  const dayRes = reservations.filter(r => r.date === selectedDate);
  const totalByType: Record<string, number> = {};
  ROOM_TYPES.forEach(rt => { totalByType[rt] = rooms.filter(r => r.type === rt && !r.blocked).length; });
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach(rt => (booked[rt] = 0));
  dayRes.forEach(r => { if (booked[r.roomType] !== undefined) booked[r.roomType]++; });

  const seen = new Set<string>();
  const pending: { r: Reservation; remaining: number }[] = [];
  dayRes.forEach(r => { const k = groupKey(r); if (seen.has(k)) return; seen.add(k); const rem = getGroupRemaining(r, reservations); if (rem > 0) pending.push({ r, remaining: rem }); });

  return (
    <div className="sidebar">
      <button className="btn-primary btn-full btn-new-sidebar" onClick={onNew}>+ Nueva Reservacion</button>
      <button className="btn-report btn-full" onClick={onReport}>🔧 Reportar Arreglo</button>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Habitaciones Disponibles <span className="availability-date">{fmtDisp(selectedDate)}</span></div>
        {ROOM_TYPES.map(rt => { const avail = totalByType[rt] - booked[rt]; return (<div key={rt} className="sidebar-avail-row"><span className="sidebar-avail-type">{rt}</span><span className={`sidebar-avail-count ${avail <= 0 ? 'full' : ''}`}>{avail <= 0 ? 'Lleno' : `${avail} disponible${avail !== 1 ? 's' : ''}`}</span></div>); })}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Significado de Colores</div>
        <div className="color-legend">
          <div className="legend-item"><span className="legend-dot legend-orange" /><span>Reserva sin anticipo</span></div>
          <div className="legend-item"><span className="legend-dot legend-blue" /><span>Reserva con anticipo</span></div>
          <div className="legend-item"><span className="legend-dot legend-green" /><span>Pagado completo</span></div>
          <div className="legend-item"><span className="legend-check">✓</span><span>Check-in realizado</span></div>
        </div>
      </div>
      {pending.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-alert">Pagos Pendientes Hoy</div>
          <div className="pending-list">{pending.map(({ r, remaining }) => (<div key={r.id} className="pending-item"><span className="pending-name">{r.name}</span><span className="pending-room">#{r.roomNumber}</span><span className="pending-amount">{fmtMXN(remaining)}</span></div>))}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════ REPORT MAINTENANCE MODAL ═══════ */
function ReportModal({ rooms, onClose, onSave }: { rooms: RoomDef[]; onClose: () => void; onSave: (room: string, desc: string) => void }) {
  const [room, setRoom] = useState(''); const [desc, setDesc] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!desc.trim()) return; setSaving(true); await onSave(room, desc.trim()); setSaving(false); };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Reportar Arreglo</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}>
        <div className="input-group"><label>Cuarto (opcional)</label><select value={room} onChange={e => setRoom(e.target.value)}><option value="">General / Area comun</option>{rooms.map(rm => <option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num}</option>)}</select></div>
        <div className="input-group"><label>Que necesita arreglo?</label><textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: La regadera del bano gotea, foco fundido..." rows={3} required /></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving || !desc.trim()}>{saving ? 'Enviando...' : 'Enviar Reporte'}</button></div>
      </form></div></div>
  );
}

/* ═══════ NEW RESERVATION MODAL ═══════ */
function NewReservationModal({ config, allGuests, onClose, onSave }: { config: Config; allGuests: { name: string; phone: string }[]; onClose: () => void; onSave: (d: any) => void }) {
  const { rooms, prices } = config;
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [name, setName] = useState(''); const [employee, setEmployee] = useState('');
  const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [origin, setOrigin] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['']);
  const [numPeople, setNumPeople] = useState(1);
  const [paymentType, setPaymentType] = useState<PaymentType>('Efectivo');
  const [anticipoPaid, setAnticipoPaid] = useState(''); const [paidInFull, setPaidInFull] = useState(false);
  const [comments, setComments] = useState(''); const [saving, setSaving] = useState(false);
  const [occupiedRooms, setOccupiedRooms] = useState<Set<string>>(new Set());
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    if (startDate && endDate && endDate > startDate) {
      setCheckingAvail(true);
      const lastNight = fmt(addDays(new Date(endDate + 'T12:00:00'), -1));
      apiGetReservations(startDate, lastNight).then((res: Reservation[]) => {
        const occ = new Set<string>();
        res.forEach(r => { if (r.roomNumber) occ.add(r.roomNumber); });
        rooms.forEach(rm => { if (rm.blocked) occ.add(rm.num.toString()); });
        setOccupiedRooms(occ);
        setSelectedRooms(prev => prev.map(rn => (rn && occ.has(rn)) ? '' : rn));
        setCheckingAvail(false);
      }).catch(() => setCheckingAvail(false));
    } else {
      const occ = new Set<string>(); rooms.forEach(rm => { if (rm.blocked) occ.add(rm.num.toString()); });
      setOccupiedRooms(occ);
    }
  }, [startDate, endDate, rooms]);

  const datesReady = !!(startDate && endDate && endDate > startDate);
  const isReturning = (() => {
    if (!name.trim() || !phone.trim()) return false;
    return allGuests.some(g => g.name.trim().toLowerCase() === name.trim().toLowerCase() && g.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') && phone.replace(/\D/g, '').length >= 7);
  })();

  let nights = 0;
  if (datesReady) { const s = new Date(startDate + 'T12:00:00'), e = new Date(endDate + 'T12:00:00'); nights = Math.round((e.getTime() - s.getTime()) / 86400000); }
  const roomsByNum: Record<string, RoomDef> = {};
  rooms.forEach(rm => { roomsByNum[rm.num.toString()] = rm; });
  const grandTotal = selectedRooms.filter(Boolean).reduce((sum, rn) => { const rm = roomsByNum[rn]; return sum + (rm ? (prices[rm.type] || 0) * nights : 0); }, 0);

  const updateRoom = (idx: number, val: string) => { setSelectedRooms(prev => prev.map((r, i) => i === idx ? val : r)); };
  const addRoomSlot = () => setSelectedRooms(prev => [...prev, '']);
  const removeRoomSlot = (idx: number) => setSelectedRooms(prev => prev.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = selectedRooms.filter(Boolean);
    if (!name.trim() || !employee.trim() || !startDate || !endDate) return;
    if (endDate <= startDate) { alert('La fecha de salida debe ser posterior a la de entrada'); return; }
    if (chosen.length === 0) { alert('Selecciona al menos un cuarto'); return; }
    const dup = chosen.filter((v, i) => chosen.indexOf(v) !== i);
    if (dup.length) { alert('Hay cuartos repetidos, elige cuartos distintos'); return; }
    for (const rn of chosen) { if (occupiedRooms.has(rn)) { alert(`El cuarto ${rn} no esta disponible en esas fechas.`); return; } }
    setSaving(true);
    await onSave({ name: name.trim(), employee: employee.trim(), phone: phone.trim(), email: email.trim(), origin: origin.trim(), startDate, endDate, roomNumbers: chosen.join(','), numPeople, paymentType, anticipoPaid: paidInFull ? '' : anticipoPaid.trim(), comments: comments.trim(), paidInFull });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Nueva Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}>
        <div className="form-step-label">1. Selecciona las fechas</div>
        <div className="form-row-2col">
          <div className="input-group"><label>Fecha de Entrada</label><input type="date" value={startDate} required onChange={e => { setStartDate(e.target.value); if (!endDate || endDate <= e.target.value) { const next = new Date(e.target.value + 'T12:00:00'); next.setDate(next.getDate() + 1); setEndDate(fmt(next)); } }} /></div>
          <div className="input-group"><label>Fecha de Salida (Checkout)</label><input type="date" value={endDate} min={startDate ? fmt(addDays(new Date(startDate + 'T12:00:00'), 1)) : ''} required onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        {!datesReady && <div className="form-hint">Selecciona las fechas para ver los cuartos disponibles.</div>}
        {datesReady && (
          <>
            {checkingAvail && <div className="form-hint">Verificando disponibilidad...</div>}
            <div className="form-step-label">2. Selecciona los cuartos</div>
            {selectedRooms.map((rn, idx) => (
              <div key={idx} className="room-slot-row">
                <select value={rn} onChange={e => updateRoom(idx, e.target.value)}>
                  <option value="">Seleccionar cuarto disponible</option>
                  {rooms.map(rm => { const occ = occupiedRooms.has(rm.num.toString()) && rn !== rm.num.toString(); const takenHere = selectedRooms.includes(rm.num.toString()) && rn !== rm.num.toString(); return <option key={rm.num} value={rm.num.toString()} disabled={occ || takenHere}>Cuarto {rm.num} ({rm.typeShort}) - {fmtMXN(prices[rm.type] || 0)}{occ ? ' — Ocupado' : takenHere ? ' — Ya elegido' : ''}</option>; })}
                </select>
                {selectedRooms.length > 1 && <button type="button" className="btn-remove-room" onClick={() => removeRoomSlot(idx)}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn-add-room" onClick={addRoomSlot}>+ Agregar otro cuarto</button>

            <div className="form-step-label">3. Datos del huesped</div>
            <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required /></div>
            {isReturning && <div className="welcome-back">👋 Welcome back! Este huesped ya se ha hospedado antes.</div>}
            <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e => setEmployee(e.target.value)} placeholder="Nombre del empleado" required /></div>
            <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Numero de telefono" /></div>
            <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="input-group"><label>De donde nos visita?</label><input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ciudad, estado o pais" /></div>
            <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>)}</select></div>
            <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></div>
            {!paidInFull && <div className="input-group"><label>Anticipo</label><input type="text" value={anticipoPaid} onChange={e => setAnticipoPaid(e.target.value)} placeholder="Ej: $500, 50%, ninguno" /></div>}
            <div className="paid-full-toggle">
              <label className="checkbox-label"><input type="checkbox" checked={paidInFull} onChange={e => setPaidInFull(e.target.checked)} /><span><strong>Pagado</strong> — el cliente pago el total y hace check-in ahora (walk-in)</span></label>
            </div>
            <div className="input-group"><label>Comentarios</label><textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Notas adicionales..." rows={2} /></div>
            <div className="reservation-preview"><span>{nights} noche{nights !== 1 ? 's' : ''} · {selectedRooms.filter(Boolean).length} cuarto(s)</span><span className="preview-price">{fmtMXN(grandTotal)}</span></div>
          </>
        )}
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving || !datesReady || !name.trim() || !employee.trim() || selectedRooms.filter(Boolean).length === 0}>{saving ? 'Guardando...' : paidInFull ? 'Guardar (Pagado + Check-in)' : 'Guardar Reservacion'}</button></div>
      </form></div></div>
  );
}

/* ═══════ EDIT MODAL ═══════ */
function EditReservationModal({ config, onClose, onSave, initial }: { config: Config; onClose: () => void; onSave: (d: any) => void; initial: Reservation }) {
  const { rooms } = config;
  const [name, setName] = useState(initial.name); const [employee, setEmployee] = useState(initial.employee);
  const [phone, setPhone] = useState(initial.phone); const [email, setEmail] = useState(initial.email);
  const [origin, setOrigin] = useState(initial.origin || ''); const [date, setDate] = useState(initial.date);
  const [checkout, setCheckout] = useState(initial.checkout || '');
  const [roomType, setRoomType] = useState<RoomType>(initial.roomType);
  const [numPeople, setNumPeople] = useState(initial.numPeople);
  const [roomNumber, setRoomNumber] = useState(initial.roomNumber);
  const [paymentType, setPaymentType] = useState<PaymentType>(initial.paymentType);
  const [anticipoPaid, setAnticipoPaid] = useState(String(initial.anticipoPaid || ''));
  const [status, setStatus] = useState<ReservationStatus>(initial.status);
  const [comments, setComments] = useState(initial.comments || ''); const [saving, setSaving] = useState(false);
  const changeRoomType = (rt: RoomType) => { setRoomType(rt); if (!PEOPLE_OPTIONS[rt].includes(numPeople)) setNumPeople(PEOPLE_OPTIONS[rt][0]); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim() || !employee.trim() || !date) return; setSaving(true); await onSave({ name: name.trim(), employee: employee.trim(), phone: phone.trim(), email: email.trim(), origin: origin.trim(), date, checkout, roomType, numPeople, roomNumber: roomNumber.trim(), paymentType, anticipoPaid: anticipoPaid.trim(), status, comments: comments.trim() }); setSaving(false); };
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Editar Reservacion (esta noche)</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}>
        <div className="input-group"><label>Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus /></div>
        <div className="input-group"><label>Empleado</label><input type="text" value={employee} onChange={e => setEmployee(e.target.value)} required /></div>
        <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="input-group"><label>Origen</label><input type="text" value={origin} onChange={e => setOrigin(e.target.value)} /></div>
        <div className="form-row-2col">
          <div className="input-group"><label>Fecha (noche)</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          <div className="input-group"><label>Checkout</label><input type="date" value={checkout} onChange={e => setCheckout(e.target.value)} /></div>
        </div>
        <div className="input-group"><label>Cuarto</label><select value={roomNumber} onChange={e => { setRoomNumber(e.target.value); const rm = rooms.find(r => r.num.toString() === e.target.value); if (rm && rm.type !== roomType) changeRoomType(rm.type); }}><option value="">Seleccionar</option>{rooms.map(rm => <option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>)}</select></div>
        <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e => changeRoomType(e.target.value as RoomType)}>{ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}</select></div>
        <div className="input-group"><label>Personas</label><select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
        <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></div>
        <div className="input-group"><label>Estado</label><select value={status} onChange={e => setStatus(e.target.value as ReservationStatus)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="input-group"><label>Anticipo</label><input type="text" value={anticipoPaid} onChange={e => setAnticipoPaid(e.target.value)} /></div>
        <div className="input-group"><label>Comentarios</label><textarea value={comments} onChange={e => setComments(e.target.value)} rows={2} /></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Actualizar'}</button></div>
      </form></div></div>
  );
}

/* ═══════ DETAIL MODAL ═══════ */
function DetailModal({ r, allWeek, onClose, onEdit, onDelete, onStatus, onPaymentComplete }: {
  r: Reservation; allWeek: Reservation[]; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onStatus: (s: ReservationStatus) => void; onPaymentComplete: (method: 'Tarjeta' | 'Efectivo') => void;
}) {
  const [busy1, setBusy1] = useState(false); const [busy3, setBusy3] = useState(false);
  const [showPayOptions, setShowPayOptions] = useState(false);
  const next: ReservationStatus = r.status === 'Reserva' ? 'Check-in' : 'Reserva';
  const group = getGroup(r, allWeek);
  const total = getGroupTotal(r, allWeek);
  const distinctNights = new Set(group.map(x => x.date)).size;
  const distinctRooms = Array.from(new Set(group.map(x => x.roomNumber))).filter(Boolean);
  const remaining = getGroupRemaining(r, allWeek);
  const checkInBlocked = next === 'Check-in' && remaining > 0;
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h2>Detalle de Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="detail-status-row">
        <div className={`detail-status-badge status-${r.status.toLowerCase().replace('-', '')}`}>{r.status === 'Check-in' ? '✓ Check-in' : r.status}</div>
        <button className="btn-status-toggle" disabled={busy1 || checkInBlocked} title={checkInBlocked ? 'Completa el pago para hacer check-in' : ''} onClick={async () => { setBusy1(true); await onStatus(next); setBusy1(false); }}>{busy1 ? 'Cambiando...' : `Cambiar a ${next}`}</button>
      </div>
      {checkInBlocked && <div className="checkin-warning">Para hacer check-in, primero completa el pago de la reservacion.</div>}
      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Nombre</span><span className="detail-value">{r.name}</span></div>
        <div className="detail-row"><span className="detail-label">Empleado</span><span className="detail-value">{r.employee}</span></div>
        <div className="detail-row"><span className="detail-label">Telefono</span><span className="detail-value">{r.phone || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{r.email || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Origen</span><span className="detail-value">{r.origin || 'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Entrada (noche)</span><span className="detail-value">{fmtDisp(r.date)}</span></div>
        <div className="detail-row"><span className="detail-label">Checkout</span><span className="detail-value">{fmtDisp(r.checkout)}</span></div>
        <div className="detail-row"><span className="detail-label">Cuartos</span><span className="detail-value">{distinctRooms.join(', ') || 'No asignado'}</span></div>
        <div className="detail-row"><span className="detail-label">Personas</span><span className="detail-value">{r.numPeople}</span></div>
        <div className="detail-row"><span className="detail-label">Anticipo</span><span className="detail-value">{r.anticipoPaid || 'Ninguno'}</span></div>
        <div className="detail-row"><span className="detail-label">Noches (esta semana)</span><span className="detail-value">{distinctNights}</span></div>
        <div className="detail-row"><span className="detail-label">Total reservacion</span><span className="detail-value detail-price">{fmtMXN(total)}</span></div>
        <div className="detail-row"><span className="detail-label">Restante por cobrar</span><span className={`detail-value ${remaining > 0 ? 'detail-remaining' : 'detail-paid'}`}>{remaining > 0 ? fmtMXN(remaining) : 'Pagado'}</span></div>
        <div className="detail-row full-width"><span className="detail-label">Comentarios</span><span className="detail-value">{r.comments || 'Sin comentarios'}</span></div>
      </div>
      <div className="detail-payment-row"><span className="detail-label">Metodo de Pago: <strong>{r.paymentType}</strong></span></div>
      {remaining > 0 && (
        <div className="payment-complete-section">
          {!showPayOptions ? (
            <button className="btn-payment-complete" onClick={() => setShowPayOptions(true)}>Registrar Pago Completo ({fmtMXN(remaining)} restante)</button>
          ) : (
            <div className="payment-options">
              <span className="payment-options-label">El restante de {fmtMXN(remaining)} se pago con:</span>
              <div className="payment-options-buttons">
                <button className="btn-payment-method tarjeta" disabled={busy3} onClick={async () => { setBusy3(true); await onPaymentComplete('Tarjeta'); setBusy3(false); }}>{busy3 ? '...' : 'Tarjeta'}</button>
                <button className="btn-payment-method efectivo" disabled={busy3} onClick={async () => { setBusy3(true); await onPaymentComplete('Efectivo'); setBusy3(false); }}>{busy3 ? '...' : 'Efectivo'}</button>
                <button className="btn-payment-method cancel" onClick={() => setShowPayOptions(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="modal-actions"><button className="btn-danger" onClick={onDelete}>Eliminar Reservacion</button><button className="btn-primary" onClick={onEdit}>Editar</button></div>
    </div></div>
  );
}

/* ═══════ WEEK VIEW ═══════ */
function WeekView({ reservations, rooms, weekStart, onWeekChange, onSelectDate, selectedDate, onClick, onJump }: {
  reservations: Reservation[]; rooms: RoomDef[]; weekStart: Date; onWeekChange: (d: number) => void;
  onSelectDate: (d: string) => void; selectedDate: string; onClick: (r: Reservation) => void; onJump: (d: string) => void;
}) {
  const days = weekDays(weekStart); const todayStr = today();
  const byDate: Record<string, Reservation[]> = {};
  days.forEach(d => { byDate[fmt(d)] = reservations.filter(r => r.date === fmt(d)); });
  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-nav" onClick={() => onWeekChange(-1)}>←</button>
        <div className="week-nav-center"><h2 className="week-label">{fmtDisp(fmt(days[0]))} — {fmtDisp(fmt(days[6]))}</h2><input type="date" className="week-date-picker" value={fmt(weekStart)} onChange={e => { if (e.target.value) onJump(e.target.value); }} /></div>
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
              <div className="day-col-header">{isToday && <span className="today-badge">Hoy</span>}<span className="day-name">{DAY_NAMES[d.getDay()]}</span><span className="day-date-num">{d.getDate()}</span><div className="day-col-stats"><span>{dayRes.length} reservaciones</span></div></div>
              {rooms.map(rm => {
                const res = map[rm.num.toString()];
                if (res) {
                  const color = getResColor(res, reservations);
                  const checkedIn = res.status === 'Check-in';
                  return (<div key={rm.num} className={`room-cell occupied res-color-${color}`} onClick={e => { e.stopPropagation(); onClick(res); }}><div className="room-cell-top"><span className="room-cell-num">{rm.num}</span>{checkedIn && <span className="checkin-badge" title="Check-in realizado">✓</span>}</div><span className="room-cell-name">{res.name}</span></div>);
                }
                if (rm.blocked) return (<div key={rm.num} className="room-cell blocked" title={rm.reason || 'Bloqueado'}><span className="room-cell-num">{rm.num}</span><span className="room-cell-block">🔧</span></div>);
                return (<div key={rm.num} className="room-cell empty"><span className="room-cell-num">{rm.num}</span></div>);
              })}
            </div>);
        })}
      </div>
    </div>
  );
}

/* ═══════ MANAGER DASHBOARD ═══════ */
function ManagerDashboard({ config, onLogout }: { config: Config; onLogout: () => void }) {
  const [reservations, setRes] = useState<Reservation[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(today());
  const [showNew, setShowNew] = useState(false); const [showReport, setShowReport] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null); const [edit, setEdit] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [allGuests, setAllGuests] = useState<{ name: string; phone: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const flash = (m: string, t: 'success' | 'error' = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => { setLoading(true); setRes(await apiGetReservations(fmt(weekStart), fmt(addDays(weekStart, 6)))); setLoading(false); }, [weekStart]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { (async () => { const all = await apiGetAllReservations(); const seen = new Set<string>(); const guests: { name: string; phone: string }[] = []; all.forEach((r: Reservation) => { const k = `${r.name}|${r.phone}`; if (!seen.has(k) && r.name && r.phone) { seen.add(k); guests.push({ name: r.name, phone: r.phone }); } }); setAllGuests(guests); })(); }, [showNew]);

  const handleAdd = async (data: any) => { const r = await apiAddReservation(data); if (r.success) { flash(`Reservacion guardada (${r.rooms} cuarto(s), ${r.nights} noche(s))`); setShowNew(false); load(); } else flash(r.error || 'Error', 'error'); };
  const handleUpdate = async (data: any) => { if (!edit?.rowIndex) return; const r = await apiUpdateReservation({ ...data, rowIndex: edit.rowIndex }); if (r.success) { flash('Actualizada'); setEdit(null); load(); } else flash(r.error || 'Error', 'error'); };
  const handleDelete = async (r: Reservation) => { if (!confirm(`Eliminar TODA la reservacion de ${r.name}? (todas las noches y cuartos)`)) return; const res = await apiDeleteReservation(r.reservationId, r.name, r.roomNumber, r.registrationDate); if (res.success) { flash(`Eliminada (${res.deleted} registros)`); setDetail(null); load(); } else flash('Error', 'error'); };
  const bulkStatus = async (r: Reservation, ns: ReservationStatus) => { const res = await apiBulkStatusUpdate({ reservationId: r.reservationId, name: r.name, roomNumber: r.roomNumber, registrationDate: r.registrationDate, newStatus: ns }); if (res.success) { flash(`${ns} aplicado`); setDetail(null); load(); } else flash('Error', 'error'); };
  const handlePaymentComplete = async (r: Reservation, method: 'Tarjeta' | 'Efectivo') => { const res = await apiBulkPaymentComplete({ reservationId: r.reservationId, name: r.name, roomNumber: r.roomNumber, registrationDate: r.registrationDate, method }); if (res.success) { flash(`Pago completo registrado (${method})`); setDetail(null); load(); } else flash('Error', 'error'); };
  const handleReport = async (room: string, desc: string) => { const res = await apiAddMaintenance(room, desc, 'Gerente'); if (res.success) { flash('Reporte enviado al admin'); setShowReport(false); } else flash('Error', 'error'); };

  return (
    <div className="dashboard">
      <header className="dashboard-header"><div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira</h1></div><div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div></header>
      <main className="dashboard-body">
        <ManagerSidebar reservations={reservations} rooms={config.rooms} selectedDate={selectedDate} onNew={() => setShowNew(true)} onReport={() => setShowReport(true)} />
        <div className="main-content">
          {loading ? <div className="loading-state"><div className="spinner" /><p>Cargando...</p></div> :
            <WeekView reservations={reservations} rooms={config.rooms} weekStart={weekStart} onWeekChange={dir => setWeekStart(prev => addDays(prev, dir * 7))} onSelectDate={setSelectedDate} selectedDate={selectedDate} onClick={setDetail} onJump={ds => setWeekStart(getMonday(new Date(ds + 'T12:00:00')))} />}
        </div>
      </main>
      {showNew && <NewReservationModal config={config} allGuests={allGuests} onClose={() => setShowNew(false)} onSave={handleAdd} />}
      {showReport && <ReportModal rooms={config.rooms} onClose={() => setShowReport(false)} onSave={handleReport} />}
      {edit && <EditReservationModal config={config} onClose={() => setEdit(null)} onSave={handleUpdate} initial={edit} />}
      {detail && !edit && <DetailModal r={detail} allWeek={reservations} onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null); }} onDelete={() => handleDelete(detail)} onStatus={async ns => bulkStatus(detail, ns)} onPaymentComplete={async method => handlePaymentComplete(detail, method)} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}
    </div>
  );
}

/* ═══════ ADMIN: REPORTS TAB ═══════ */
function AdminReports({ allRes }: { allRes: Reservation[] }) {
  const [selectedDay, setSelectedDay] = useState(today());
  const [payLog, setPayLog] = useState<PaymentLogEntry[]>([]);
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  useEffect(() => { (async () => { setPayLog(await apiGetPaymentLog(selectedDay)); })(); }, [selectedDay]);

  const dayRes = allRes.filter(r => r.date === selectedDay);
  const dayTotal = dayRes.reduce((s, r) => s + r.price, 0);
  const dayTarjeta = dayRes.filter(r => r.paymentType === 'Tarjeta').reduce((s, r) => s + r.price, 0);
  const dayEfectivo = dayRes.filter(r => r.paymentType === 'Efectivo').reduce((s, r) => s + r.price, 0);
  const dayPending = (() => { const seen = new Set<string>(); let sum = 0; dayRes.forEach(r => { const k = groupKey(r); if (seen.has(k)) return; seen.add(k); sum += getGroupRemaining(r, allRes); }); return sum; })();
  const payTarjeta = payLog.filter(p => p.method === 'Tarjeta').reduce((s, p) => s + p.amount, 0);
  const payEfectivo = payLog.filter(p => p.method === 'Efectivo').reduce((s, p) => s + p.amount, 0);

  const mon = getMonday(new Date()); const sun = addDays(mon, 6);
  const weekRes = allRes.filter(r => r.date >= fmt(mon) && r.date <= fmt(sun));
  const weekTotal = weekRes.reduce((s, r) => s + r.price, 0);
  const weekTarjeta = weekRes.filter(r => r.paymentType === 'Tarjeta').reduce((s, r) => s + r.price, 0);
  const weekEfectivo = weekRes.filter(r => r.paymentType === 'Efectivo').reduce((s, r) => s + r.price, 0);

  const monthStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;
  const monthRes = allRes.filter(r => r.date.startsWith(monthStr));
  const monthTotal = monthRes.reduce((s, r) => s + r.price, 0);

  const roomCounts: Record<string, number> = {};
  allRes.forEach(r => { if (r.roomNumber) roomCounts[r.roomNumber] = (roomCounts[r.roomNumber] || 0) + 1; });
  const topRooms = Object.entries(roomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const groupsMap: Record<string, { name: string; room: string; dates: string[]; total: number; anticipo: string; status: string }> = {};
  allRes.forEach(r => { const key = groupKey(r); if (!groupsMap[key]) groupsMap[key] = { name: r.name, room: r.roomNumber, dates: [], total: 0, anticipo: r.anticipoPaid, status: r.status }; groupsMap[key].dates.push(r.date); groupsMap[key].total += Number(r.price); if (r.status === 'Check-in') groupsMap[key].status = 'Check-in'; });
  const monthGroups = Object.values(groupsMap).filter(g => g.dates.some(d => d.startsWith(monthStr))).map(g => { const paid = parseAnticipo(g.anticipo, g.total); return { ...g, paid, remaining: Math.max(0, g.total - paid), start: g.dates.slice().sort()[0], end: g.dates.slice().sort()[g.dates.length - 1] }; }).sort((a, b) => a.start.localeCompare(b.start));

  const calFirst = new Date(viewMonth.year, viewMonth.month, 1);
  const calLast = new Date(viewMonth.year, viewMonth.month + 1, 0);
  const startDay = calFirst.getDay(); const daysInMonth = calLast.getDate();
  const resByDate: Record<string, number> = {};
  monthRes.forEach(r => { resByDate[r.date] = (resByDate[r.date] || 0) + 1; });
  const calCells: ({ day: number; count: number; date: string } | null)[] = [];
  for (let i = 0; i < startDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) { const ds = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; calCells.push({ day: d, count: resByDate[ds] || 0, date: ds }); }

  return (
    <div className="admin-body">
      <div className="admin-row">
        <div className="admin-card">
          <div className="admin-card-head"><h3>Dia Seleccionado</h3><input type="date" className="admin-date-picker" value={selectedDay} onChange={e => { if (e.target.value) setSelectedDay(e.target.value); }} /></div>
          <div className="admin-stat-row"><span>Reservaciones</span><strong>{dayRes.length}</strong></div>
          <div className="admin-stat-row"><span>Total</span><strong className="text-success">{fmtMXN(dayTotal)}</strong></div>
          <div className="admin-stat-row"><span>Tarjeta</span><strong>{fmtMXN(dayTarjeta)}</strong></div>
          <div className="admin-stat-row"><span>Efectivo</span><strong>{fmtMXN(dayEfectivo)}</strong></div>
          <div className="admin-stat-row"><span>Pendiente por cobrar</span><strong className="text-danger">{fmtMXN(dayPending)}</strong></div>
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
          {topRooms.length === 0 ? <p className="text-muted">Sin datos</p> : topRooms.map(([room, count]) => (<div key={room} className="admin-stat-row"><span>Cuarto {room}</span><strong>{count} noches</strong></div>))}
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-card admin-card-full">
          <div className="admin-card-head"><h3>Actividad de Pagos Completados — {fmtDisp(selectedDay)}</h3></div>
          <p className="admin-sub">Pagos restantes registrados por el gerente en esta fecha (dinero recibido en caja).</p>
          {payLog.length === 0 ? <p className="text-muted">No se registraron pagos completos este dia.</p> : (
            <>
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Hora</th><th>Reservacion</th><th>Cuarto</th><th>Metodo</th><th>Monto Cobrado</th></tr></thead>
                <tbody>{payLog.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((p, i) => (<tr key={i}><td>{p.timestamp.substring(11, 16)}</td><td>{p.name}</td><td>{p.room}</td><td><span className={`pay-method-tag ${p.method.toLowerCase()}`}>{p.method}</span></td><td className="text-success"><strong>{fmtMXN(p.amount)}</strong></td></tr>))}</tbody></table></div>
              <div className="pay-totals"><div className="pay-total-box tarjeta"><span>Total Tarjeta</span><strong>{fmtMXN(payTarjeta)}</strong></div><div className="pay-total-box efectivo"><span>Total Efectivo</span><strong>{fmtMXN(payEfectivo)}</strong></div><div className="pay-total-box grand"><span>Total Recibido</span><strong>{fmtMXN(payTarjeta + payEfectivo)}</strong></div></div>
            </>
          )}
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-card"><h3>{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3><div className="admin-stat-row"><span>Total Reservaciones</span><strong>{monthRes.length}</strong></div><div className="admin-stat-row"><span>Ingreso Total</span><strong className="text-success">{fmtMXN(monthTotal)}</strong></div></div>
        <div className="admin-card admin-card-wide">
          <div className="cal-header"><button className="btn-nav" onClick={() => setViewMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 })}>←</button><h3>{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3><button className="btn-nav" onClick={() => setViewMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 })}>→</button></div>
          <div className="cal-grid">{['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
            {calCells.map((cell, i) => { if (!cell) return <div key={`e${i}`} className="cal-cell cal-empty" />; return (<div key={cell.date} className={`cal-cell ${cell.count > 0 ? 'cal-has-res' : ''} ${cell.date === today() ? 'cal-today' : ''}`}><span className="cal-num">{cell.day}</span>{cell.count > 0 && <span className="cal-count">{cell.count}</span>}</div>); })}
          </div>
        </div>
      </div>
      <div className="admin-row">
        <div className="admin-card admin-card-full">
          <h3>Desglose por Reservacion — {MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3>
          {monthGroups.length === 0 ? <p className="text-muted">Sin reservaciones este mes.</p> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reservacion</th><th>Cuarto</th><th>Fechas</th><th>Noches</th><th>Total</th><th>Pagado</th><th>Restante</th><th>Estado</th></tr></thead>
              <tbody>{monthGroups.map((g, i) => (<tr key={i} className={g.remaining > 0 ? 'row-unpaid' : ''}><td>{g.name}</td><td>{g.room}</td><td>{fmtDisp(g.start)}{g.dates.length > 1 ? ` → ${fmtDisp(g.end)}` : ''}</td><td>{g.dates.length}</td><td>{fmtMXN(g.total)}</td><td>{fmtMXN(g.paid)}</td><td className={g.remaining > 0 ? 'text-danger' : 'text-success'}><strong>{g.remaining > 0 ? fmtMXN(g.remaining) : 'Pagado'}</strong></td><td>{g.status === 'Check-in' ? <span className="status-chip checkin">✓ Check-in</span> : <span className="status-chip reserva">Reserva</span>}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════ ADMIN: SETTINGS TAB ═══════ */
function AdminSettings({ config, onConfigChange, flash }: { config: Config; onConfigChange: () => void; flash: (m: string, t?: 'success' | 'error') => void }) {
  const { rooms, prices } = config;
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [newRoomNum, setNewRoomNum] = useState(''); const [newRoomType, setNewRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [blockNum, setBlockNum] = useState(''); const [blockReason, setBlockReason] = useState('');

  const loadExtras = useCallback(async () => { setMaintenance(await apiGetMaintenance()); setUsers(await apiGetUsers()); }, []);
  useEffect(() => { loadExtras(); }, [loadExtras]);

  const savePrice = async (rt: RoomType) => { const v = priceEdits[rt]; if (v === undefined || v === '') return; const res = await apiUpdatePrice(rt, Number(v)); if (res.success) { flash('Precio actualizado'); onConfigChange(); } else flash('Error', 'error'); };
  const addRoom = async () => { if (!newRoomNum.trim()) return; const res = await apiAddRoom(newRoomNum.trim(), newRoomType); if (res.success) { flash('Cuarto agregado'); setNewRoomNum(''); onConfigChange(); } else flash(res.error || 'Error', 'error'); };
  const delRoom = async (num: number) => { if (!confirm(`Eliminar cuarto ${num}?`)) return; const res = await apiDeleteRoom(num.toString()); if (res.success) { flash('Cuarto eliminado'); onConfigChange(); } else flash('Error', 'error'); };
  const toggleBlock = async (rm: RoomDef) => { if (rm.blocked) { const res = await apiBlockRoom(rm.num.toString(), false, ''); if (res.success) { flash('Cuarto desbloqueado'); onConfigChange(); } } else { setBlockNum(rm.num.toString()); } };
  const confirmBlock = async () => { if (!blockNum) return; const res = await apiBlockRoom(blockNum, true, blockReason.trim() || 'Mantenimiento'); if (res.success) { flash('Cuarto bloqueado'); setBlockNum(''); setBlockReason(''); onConfigChange(); } else flash('Error', 'error'); };
  const resolveMant = async (id: string) => { const res = await apiResolveMaintenance(id); if (res.success) { flash('Marcado como resuelto'); loadExtras(); } else flash('Error', 'error'); };

  const pendingMant = maintenance.filter(m => m.status !== 'Resuelto');
  const resolvedMant = maintenance.filter(m => m.status === 'Resuelto');

  return (
    <div className="admin-body">
      {/* Maintenance to-do */}
      <div className="admin-row">
        <div className="admin-card admin-card-full">
          <h3>🔧 Cosas por Arreglar (reportadas por el gerente)</h3>
          {pendingMant.length === 0 ? <p className="text-muted">No hay pendientes.</p> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Fecha</th><th>Cuarto</th><th>Descripcion</th><th>Reportado por</th><th>Accion</th></tr></thead>
              <tbody>{pendingMant.map(m => (<tr key={m.id}><td>{m.timestamp.substring(0, 16)}</td><td>{m.room || 'General'}</td><td>{m.description}</td><td>{m.createdBy}</td><td><button className="btn-mini" onClick={() => resolveMant(m.id)}>Marcar resuelto</button></td></tr>))}</tbody></table></div>
          )}
          {resolvedMant.length > 0 && <details className="resolved-details"><summary>{resolvedMant.length} resueltos</summary><div className="admin-table-wrap"><table className="admin-table"><tbody>{resolvedMant.map(m => (<tr key={m.id} className="resolved-row"><td>{m.timestamp.substring(0, 16)}</td><td>{m.room || 'General'}</td><td>{m.description}</td></tr>))}</tbody></table></div></details>}
        </div>
      </div>

      {/* Prices */}
      <div className="admin-row">
        <div className="admin-card admin-card-wide">
          <h3>Precios por Tipo de Habitacion</h3>
          <p className="admin-sub">Los cambios aplican a nuevas reservaciones (no a las ya guardadas).</p>
          {ROOM_TYPES.map(rt => (
            <div key={rt} className="price-edit-row">
              <span className="price-type">{rt}</span>
              <div className="price-edit-controls">
                <span className="price-current">Actual: {fmtMXN(prices[rt] || 0)}</span>
                <input type="number" className="price-input" placeholder="Nuevo" value={priceEdits[rt] ?? ''} onChange={e => setPriceEdits(p => ({ ...p, [rt]: e.target.value }))} />
                <button className="btn-mini" onClick={() => savePrice(rt)}>Guardar</button>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-card">
          <h3>Agregar Cuarto</h3>
          <div className="input-group"><label>Numero</label><input type="number" value={newRoomNum} onChange={e => setNewRoomNum(e.target.value)} placeholder="Ej: 131" /></div>
          <div className="input-group"><label>Tipo</label><select value={newRoomType} onChange={e => setNewRoomType(e.target.value as RoomType)}>{ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}</select></div>
          <button className="btn-primary btn-full" onClick={addRoom}>Agregar Cuarto</button>
        </div>
      </div>

      {/* Rooms list w/ block + delete */}
      <div className="admin-row">
        <div className="admin-card admin-card-full">
          <h3>Cuartos ({rooms.length})</h3>
          {blockNum && (
            <div className="block-form">
              <span>Bloquear cuarto {blockNum} — razon:</span>
              <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ej: Fuga de agua, reparacion electrica" />
              <button className="btn-mini danger" onClick={confirmBlock}>Bloquear</button>
              <button className="btn-mini" onClick={() => { setBlockNum(''); setBlockReason(''); }}>Cancelar</button>
            </div>
          )}
          <div className="rooms-grid-admin">
            {rooms.map(rm => (
              <div key={rm.num} className={`room-admin-card ${rm.blocked ? 'blocked' : ''}`}>
                <div className="room-admin-top"><span className="room-admin-num">{rm.num}</span><span className="room-admin-type">{rm.typeShort}</span></div>
                {rm.blocked && <div className="room-admin-reason">🔧 {rm.reason || 'Bloqueado'}</div>}
                <div className="room-admin-actions">
                  <button className="btn-mini" onClick={() => toggleBlock(rm)}>{rm.blocked ? 'Desbloquear' : 'Bloquear'}</button>
                  <button className="btn-mini danger" onClick={() => delRoom(rm.num)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Passwords */}
      <div className="admin-row">
        <div className="admin-card admin-card-full">
          <h3>Accesos / Contrasenas</h3>
          <p className="admin-sub">Para agregar o cambiar contrasenas, edita la hoja "Usuarios" en Google Sheets.</p>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contrasena</th><th>Rol</th><th>Etiqueta</th><th>Ultimo Acceso</th></tr></thead>
            <tbody>{users.map((u, i) => (<tr key={i}><td><code>{u.password}</code></td><td>{u.role === 'admin' ? <span className="status-chip checkin">Admin</span> : <span className="status-chip reserva">Gerente</span>}</td><td>{u.label}</td><td>{u.lastUsed ? u.lastUsed.substring(0, 16) : 'Nunca'}</td></tr>))}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════ ADMIN DASHBOARD (tabs) ═══════ */
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'reports' | 'settings'>('reports');
  const [allRes, setAllRes] = useState<Reservation[]>([]);
  const [config, setConfig] = useState<Config>({ rooms: DEFAULT_ROOMS, prices: DEFAULT_PRICES });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const flash = (m: string, t: 'success' | 'error' = 'success') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000); };
  const loadConfig = useCallback(async () => { const c = await apiGetConfig(); if (c && c.rooms && c.rooms.length) setConfig(c); }, []);
  useEffect(() => { (async () => { setLoading(true); setAllRes(await apiGetAllReservations()); await loadConfig(); setLoading(false); })(); }, [loadConfig]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira — Admin</h1></div>
        <div className="header-center"><div className="admin-tabs"><button className={`admin-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reportes de Dinero</button><button className={`admin-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Configuracion</button></div></div>
        <div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div>
      </header>
      {loading ? <div className="loading-state"><div className="spinner" /><p>Cargando datos...</p></div> :
        tab === 'reports' ? <AdminReports allRes={allRes} /> : <AdminSettings config={config} onConfigChange={loadConfig} flash={flash} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}
    </div>
  );
}

/* ═══════ APP ROOT ═══════ */
export default function App() {
  const [role, setRole] = useState<string | null>(() => sessionStorage.getItem('hotel_auth'));
  const [config, setConfig] = useState<Config | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (role && role !== 'admin' && !config) {
      setLoadingConfig(true);
      apiGetConfig().then(c => { setConfig(c && c.rooms && c.rooms.length ? c : { rooms: DEFAULT_ROOMS, prices: DEFAULT_PRICES }); setLoadingConfig(false); }).catch(() => { setConfig({ rooms: DEFAULT_ROOMS, prices: DEFAULT_PRICES }); setLoadingConfig(false); });
    }
  }, [role, config]);

  const handleLogout = () => { sessionStorage.removeItem('hotel_auth'); setRole(null); setConfig(null); };
  if (!role) return <LoginScreen onLogin={(r) => setRole(r)} />;
  if (role === 'admin') return <AdminDashboard onLogout={handleLogout} />;
  if (loadingConfig || !config) return <div className="loading-state" style={{ minHeight: '100vh' }}><div className="spinner" /><p>Cargando configuracion...</p></div>;
  return <ManagerDashboard config={config} onLogout={handleLogout} />;
}
