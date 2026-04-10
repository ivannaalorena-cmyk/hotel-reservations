import { useState, useEffect, useCallback } from 'react';
import {
  Reservation, RoomType, PaymentType, ReservationStatus,
  ROOM_TYPES, PAYMENT_TYPES, STATUSES, ROOM_PRICES, TOTAL_ROOMS,
  PEOPLE_OPTIONS, ROOM_MAP, DAY_NAMES,
} from './types';
import {
  apiLogin, apiGetReservations, apiAddReservation,
  apiUpdateReservation, apiDeleteReservation,
} from './api';

/* ── helpers ── */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function fmtDisp(s: string) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtMXN(n: number) { return `$${n.toLocaleString('es-MX')} MXN`; }
function weekDays(mon: Date) { return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function today() { return fmt(new Date()); }

/* ══════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    if (await apiLogin(pw)) { sessionStorage.setItem('hotel_auth', 'true'); onLogin(); }
    else setErr('Contrasena incorrecta');
    setBusy(false);
  };

  return (
    <div className="login-container">
      <div className="login-bg-pattern" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🏨</div>
          <h1>Hotel Ancira</h1>
          <p>Sistema de Gestion de Reservaciones</p>
        </div>
        <form onSubmit={submit}>
          <div className="input-group">
            <label>Contrasena</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Ingresa la contrasena" autoFocus />
          </div>
          {err && <div className="error-msg">{err}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={busy}>
            {busy ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SIDEBAR  (left)
   ══════════════════════════════════════════════ */
function Sidebar({ reservations, selectedDate, onNew }: {
  reservations: Reservation[]; selectedDate: string; onNew: () => void;
}) {
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach(rt => (booked[rt] = 0));
  reservations.filter(r => r.date === selectedDate).forEach(r => {
    if (booked[r.roomType] !== undefined) booked[r.roomType]++;
  });
  const totalRes = Object.values(booked).reduce((a, b) => a + b, 0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a, b) => a + b, 0);

  return (
    <div className="sidebar">
      <button className="btn-primary btn-full btn-new-sidebar" onClick={onNew}>
        + Nueva Reservacion
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          Disponibilidad{' '}
          <span className="availability-date">{fmtDisp(selectedDate)}</span>
        </div>
        <div className="availability-summary">
          <div className="summary-stat">
            <span className="stat-number">{totalRes}</span>
            <span className="stat-label">Reservadas</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="stat-number available">{totalRooms - totalRes}</span>
            <span className="stat-label">Disponibles</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="stat-number">{totalRooms}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Por Tipo</div>
        <div className="room-types-grid">
          {ROOM_TYPES.map(rt => {
            const avail = TOTAL_ROOMS[rt] - booked[rt];
            const pct = (booked[rt] / TOTAL_ROOMS[rt]) * 100;
            return (
              <div key={rt} className="room-type-card">
                <div className="room-type-header"><span className="room-name">{rt}</span></div>
                <div className="room-bar-container">
                  <div className="room-bar-fill" style={{ width: `${pct}%` }}
                    data-full={avail === 0 ? 'true' : 'false'} />
                </div>
                <div className="room-type-stats">
                  <span className={`room-available ${avail === 0 ? 'full' : ''}`}>
                    {avail === 0 ? 'Lleno' : `${avail} disp.`}
                  </span>
                  <span className="room-count">{booked[rt]}/{TOTAL_ROOMS[rt]}</span>
                </div>
                <div className="room-price">{fmtMXN(ROOM_PRICES[rt])}/noche</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NEW RESERVATION MODAL  (multi-day)
   ══════════════════════════════════════════════ */
function NewReservationModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (d: any) => void;
}) {
  const [name, setName] = useState('');
  const [employee, setEmployee] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [numPeople, setNumPeople] = useState(PEOPLE_OPTIONS[ROOM_TYPES[0]][0]);
  const [roomNumber, setRoomNumber] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PAYMENT_TYPES[0]);
  const [anticipoPaid, setAnticipoPaid] = useState(false);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const changeRoomType = (rt: RoomType) => {
    setRoomType(rt);
    if (!PEOPLE_OPTIONS[rt].includes(numPeople)) setNumPeople(PEOPLE_OPTIONS[rt][0]);
  };

  let nights = 0;
  if (startDate && endDate && endDate >= startDate) {
    const s = new Date(startDate + 'T12:00:00'), e = new Date(endDate + 'T12:00:00');
    nights = Math.round((e.getTime() - s.getTime()) / 86400000);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employee.trim() || !startDate || !endDate) return;
    if (endDate < startDate) { alert('La fecha de salida debe ser igual o posterior a la de entrada'); return; }
    setSaving(true);
    await onSave({
      name: name.trim(), employee: employee.trim(), phone: phone.trim(),
      email: email.trim(), origin: origin.trim(), startDate, endDate,
      roomType, numPeople, roomNumber: roomNumber.trim(), paymentType,
      anticipoPaid, comments: comments.trim(),
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Reservacion</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="input-group"><label>Nombre del Solicitante</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required autoFocus /></div>
            <div className="input-group"><label>Nombre del Empleado</label>
              <input type="text" value={employee} onChange={e => setEmployee(e.target.value)} placeholder="Nombre del empleado" required /></div>
            <div className="input-group"><label>Telefono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Numero de telefono" /></div>
            <div className="input-group"><label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="input-group"><label>De donde nos visita?</label>
              <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ciudad, estado o pais" /></div>
            <div className="input-group"><label>Numero de Cuarto</label>
              <select value={roomNumber} onChange={e => {
                setRoomNumber(e.target.value);
                const rm = ROOM_MAP.find(r => r.num.toString() === e.target.value);
                if (rm && rm.type !== roomType) changeRoomType(rm.type);
              }}>
                <option value="">Seleccionar cuarto</option>
                {ROOM_MAP.map(rm => (
                  <option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>
                ))}
              </select>
            </div>
            <div className="input-group"><label>Fecha de Entrada</label>
              <input type="date" value={startDate} min={today()} required
                onChange={e => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value); }} /></div>
            <div className="input-group"><label>Fecha de Salida</label>
              <input type="date" value={endDate} min={startDate || today()} required
                onChange={e => setEndDate(e.target.value)} /></div>
            <div className="input-group"><label>Tipo de Habitacion</label>
              <select value={roomType} onChange={e => changeRoomType(e.target.value as RoomType)}>
                {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt} - {fmtMXN(ROOM_PRICES[rt])}</option>)}
              </select></div>
            <div className="input-group"><label>Numero de Personas</label>
              <select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>
                {PEOPLE_OPTIONS[roomType].map(n => <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>)}
              </select></div>
            <div className="input-group"><label>Tipo de Pago</label>
              <select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>
                {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
              </select></div>
            <div className="input-group full-width"><label>Comentarios</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                placeholder="Notas adicionales, peticiones especiales..." rows={2} /></div>
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={anticipoPaid} onChange={e => setAnticipoPaid(e.target.checked)} />
              <span>Dio anticipo del 50% del pago total?</span>
            </label>
          </div>
          <div className="reservation-preview">
            <span>{nights} noche{nights !== 1 ? 's' : ''} x {fmtMXN(ROOM_PRICES[roomType])}</span>
            <span className="preview-price">{fmtMXN(nights * ROOM_PRICES[roomType])}</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary"
              disabled={saving || !name.trim() || !employee.trim() || !startDate || !endDate}>
              {saving ? 'Guardando...' : 'Guardar Reservacion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   EDIT RESERVATION MODAL  (single day row)
   ══════════════════════════════════════════════ */
function EditReservationModal({ onClose, onSave, initial }: {
  onClose: () => void; onSave: (d: any) => void; initial: Reservation;
}) {
  const [name, setName] = useState(initial.name);
  const [employee, setEmployee] = useState(initial.employee);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [origin, setOrigin] = useState(initial.origin || '');
  const [date, setDate] = useState(initial.date);
  const [roomType, setRoomType] = useState<RoomType>(initial.roomType);
  const [numPeople, setNumPeople] = useState(initial.numPeople);
  const [roomNumber, setRoomNumber] = useState(initial.roomNumber);
  const [paymentType, setPaymentType] = useState<PaymentType>(initial.paymentType);
  const [anticipoPaid, setAnticipoPaid] = useState(initial.anticipoPaid);
  const [status, setStatus] = useState<ReservationStatus>(initial.status);
  const [comments, setComments] = useState(initial.comments || '');
  const [saving, setSaving] = useState(false);

  const changeRoomType = (rt: RoomType) => {
    setRoomType(rt);
    if (!PEOPLE_OPTIONS[rt].includes(numPeople)) setNumPeople(PEOPLE_OPTIONS[rt][0]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employee.trim() || !date) return;
    setSaving(true);
    await onSave({
      name: name.trim(), employee: employee.trim(), phone: phone.trim(),
      email: email.trim(), origin: origin.trim(), date, roomType, numPeople,
      roomNumber: roomNumber.trim(), paymentType, anticipoPaid, status,
      comments: comments.trim(),
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Reservacion</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="input-group"><label>Nombre del Solicitante</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus /></div>
            <div className="input-group"><label>Nombre del Empleado</label>
              <input type="text" value={employee} onChange={e => setEmployee(e.target.value)} required /></div>
            <div className="input-group"><label>Telefono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="input-group"><label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="input-group"><label>De donde nos visita?</label>
              <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ciudad, estado o pais" /></div>
            <div className="input-group"><label>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="input-group"><label>Numero de Cuarto</label>
              <select value={roomNumber} onChange={e => {
                setRoomNumber(e.target.value);
                const rm = ROOM_MAP.find(r => r.num.toString() === e.target.value);
                if (rm && rm.type !== roomType) changeRoomType(rm.type);
              }}>
                <option value="">Seleccionar cuarto</option>
                {ROOM_MAP.map(rm => <option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>)}
              </select></div>
            <div className="input-group"><label>Tipo de Habitacion</label>
              <select value={roomType} onChange={e => changeRoomType(e.target.value as RoomType)}>
                {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt} - {fmtMXN(ROOM_PRICES[rt])}</option>)}
              </select></div>
            <div className="input-group"><label>Numero de Personas</label>
              <select value={numPeople} onChange={e => setNumPeople(Number(e.target.value))}>
                {PEOPLE_OPTIONS[roomType].map(n => <option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>)}
              </select></div>
            <div className="input-group"><label>Tipo de Pago</label>
              <select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}>
                {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
              </select></div>
            <div className="input-group"><label>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value as ReservationStatus)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div className="input-group full-width"><label>Comentarios</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                placeholder="Notas adicionales..." rows={2} /></div>
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={anticipoPaid} onChange={e => setAnticipoPaid(e.target.checked)} />
              <span>Dio anticipo del 50% del pago total?</span>
            </label>
          </div>
          <div className="reservation-preview">
            <span>Total:</span>
            <span className="preview-price">{fmtMXN(ROOM_PRICES[roomType])}</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary"
              disabled={saving || !name.trim() || !employee.trim() || !date}>
              {saving ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DETAIL MODAL
   ══════════════════════════════════════════════ */
function DetailModal({ r, onClose, onEdit, onDelete, onStatus, onPayment }: {
  r: Reservation; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onStatus: (s: ReservationStatus) => void; onPayment: (p: PaymentType) => void;
}) {
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);
  const next: ReservationStatus = r.status === 'Reserva' ? 'Check-in' : 'Reserva';
  const isPF = r.paymentType === 'Pago Faltante';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle de Reservacion</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-status-row">
          <div className={`detail-status-badge status-${r.status.toLowerCase().replace('-', '')}`}>{r.status}</div>
          <button className="btn-status-toggle" disabled={busy1}
            onClick={async () => { setBusy1(true); await onStatus(next); setBusy1(false); }}>
            {busy1 ? 'Cambiando...' : `Cambiar a ${next}`}
          </button>
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
          <div className="detail-row"><span className="detail-label">Anticipo 50%</span><span className="detail-value">{r.anticipoPaid ? 'Si' : 'No'}</span></div>
          <div className="detail-row"><span className="detail-label">Precio</span><span className="detail-value detail-price">{fmtMXN(r.price)}</span></div>
          <div className="detail-row full-width"><span className="detail-label">Comentarios</span><span className="detail-value">{r.comments || 'Sin comentarios'}</span></div>
        </div>

        <div className="detail-payment-row">
          <span className="detail-label">Pago: <strong>{r.paymentType}</strong></span>
          {isPF && (
            <div className="payment-change-buttons">
              <button className="btn-payment-change tarjeta" disabled={busy2}
                onClick={async () => { setBusy2(true); await onPayment('Tarjeta'); setBusy2(false); }}>
                Cambiar a Tarjeta
              </button>
              <button className="btn-payment-change efectivo" disabled={busy2}
                onClick={async () => { setBusy2(true); await onPayment('Efectivo'); setBusy2(false); }}>
                Cambiar a Efectivo
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-danger" onClick={onDelete}>Eliminar</button>
          <button className="btn-primary" onClick={onEdit}>Editar</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   WEEK VIEW  (room grid)
   ══════════════════════════════════════════════ */
function WeekView({ reservations, weekStart, onWeekChange, onSelectDate,
  selectedDate, onClick, onJump }: {
    reservations: Reservation[]; weekStart: Date;
    onWeekChange: (d: number) => void; onSelectDate: (d: string) => void;
    selectedDate: string; onClick: (r: Reservation) => void;
    onJump: (d: string) => void;
  }) {
  const days = weekDays(weekStart);
  const todayStr = today();
  const byDate: Record<string, Reservation[]> = {};
  days.forEach(d => { byDate[fmt(d)] = reservations.filter(r => r.date === fmt(d)); });

  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-nav" onClick={() => onWeekChange(-1)}>←</button>
        <div className="week-nav-center">
          <h2 className="week-label">
            {fmtDisp(fmt(days[0]))} — {fmtDisp(fmt(days[6]))}
          </h2>
          <input type="date" className="week-date-picker" value={fmt(weekStart)}
            onChange={e => { if (e.target.value) onJump(e.target.value); }}
            title="Saltar a semana" />
        </div>
        <button className="btn-nav" onClick={() => onWeekChange(1)}>→</button>
      </div>

      <div className="week-grid-rooms">
        {/* room labels */}
        <div className="room-labels-col">
          <div className="room-label-header">Cuarto</div>
          {ROOM_MAP.map(rm => (
            <div key={rm.num} className="room-label-cell">
              <span className="room-label-num">{rm.num}</span>
              <span className="room-label-type">{rm.typeShort}</span>
            </div>
          ))}
        </div>

        {/* day columns */}
        {days.map(d => {
          const ds = fmt(d);
          const dayRes = byDate[ds] || [];
          const isToday = ds === todayStr;
          const isSel = ds === selectedDate;
          const dayTotal = dayRes.reduce((s, r) => s + r.price, 0);
          const map: Record<string, Reservation> = {};
          dayRes.forEach(r => { if (r.roomNumber) map[r.roomNumber] = r; });

          return (
            <div key={ds} className={`day-col ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
              onClick={() => onSelectDate(ds)}>
              <div className="day-col-header">
                <span className="day-name">{DAY_NAMES[d.getDay()]}</span>
                <span className="day-date-num">{d.getDate()}</span>
                {isToday && <span className="today-badge">Hoy</span>}
                <div className="day-col-stats">
                  <span>{dayRes.length} res.</span>
                  {dayTotal > 0 && <span className="day-col-total">{fmtMXN(dayTotal)}</span>}
                </div>
              </div>

              {ROOM_MAP.map(rm => {
                const res = map[rm.num.toString()];
                if (res) return (
                  <div key={rm.num}
                    className={`room-cell occupied payment-${res.paymentType.toLowerCase().replace(' ', '-')}`}
                    onClick={e => { e.stopPropagation(); onClick(res); }}>
                    <div className="room-cell-top">
                      <span className="room-cell-num">{rm.num}</span>
                      <span className={`chip-status-dot status-${res.status.toLowerCase().replace('-', '')}`} />
                    </div>
                    <span className="room-cell-name">{res.name}</span>
                  </div>
                );
                return (
                  <div key={rm.num} className="room-cell empty">
                    <span className="room-cell-num">{rm.num}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════ */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [reservations, setRes] = useState<Reservation[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(today());
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [edit, setEdit] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const flash = (m: string, t: 'success' | 'error' = 'success') => {
    setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setRes(await apiGetReservations(fmt(weekStart), fmt(addDays(weekStart, 6))));
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  /* add */
  const handleAdd = async (data: any) => {
    const r = await apiAddReservation(data);
    if (r.success) { flash(`Reservacion guardada (${r.daysCreated} noche${r.daysCreated !== 1 ? 's' : ''})`); setShowNew(false); load(); }
    else flash(r.error || 'Error', 'error');
  };

  /* update */
  const handleUpdate = async (data: any) => {
    if (!edit?.rowIndex) return;
    const r = await apiUpdateReservation({ ...data, rowIndex: edit.rowIndex });
    if (r.success) { flash('Actualizada'); setEdit(null); load(); }
    else flash(r.error || 'Error', 'error');
  };

  /* delete */
  const handleDelete = async (r: Reservation) => {
    if (!confirm(`Eliminar reservacion de ${r.name}?`)) return;
    if (!r.rowIndex) return;
    const res = await apiDeleteReservation(r.rowIndex);
    if (res.success) { flash('Eliminada'); setDetail(null); load(); }
    else flash('Error', 'error');
  };

  /* quick update (status / payment) */
  const quickUpdate = async (r: Reservation, patch: Partial<{ status: string; paymentType: string }>) => {
    if (!r.rowIndex) return;
    const res = await apiUpdateReservation({
      rowIndex: r.rowIndex, name: r.name, employee: r.employee,
      phone: r.phone, email: r.email, origin: r.origin || '',
      date: r.date, roomType: r.roomType, numPeople: r.numPeople,
      roomNumber: r.roomNumber,
      paymentType: patch.paymentType || r.paymentType,
      anticipoPaid: r.anticipoPaid,
      status: patch.status || r.status,
      comments: r.comments || '',
    });
    if (res.success) { flash('Actualizado'); setDetail(null); load(); }
    else flash('Error', 'error');
  };

  const weekTotal = reservations.reduce((s, r) => s + r.price, 0);

  return (
    <div className="dashboard">
      {/* header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira</h1>
        </div>
        <div className="header-center">
          <div className="week-summary">
            <div className="summary-item">
              <span className="summary-value">{reservations.length}</span>
              <span className="summary-label">Reservaciones</span>
            </div>
            <div className="summary-sep" />
            <div className="summary-item">
              <span className="summary-value revenue">{fmtMXN(weekTotal)}</span>
              <span className="summary-label">Ingreso Semanal</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-ghost" onClick={onLogout}>Salir</button>
        </div>
      </header>

      {/* body */}
      <main className="dashboard-body">
        <Sidebar reservations={reservations} selectedDate={selectedDate}
          onNew={() => setShowNew(true)} />
        <div className="main-content">
          {loading
            ? <div className="loading-state"><div className="spinner" /><p>Cargando reservaciones...</p></div>
            : <WeekView reservations={reservations} weekStart={weekStart}
              onWeekChange={dir => setWeekStart(prev => addDays(prev, dir * 7))}
              onSelectDate={setSelectedDate} selectedDate={selectedDate}
              onClick={setDetail}
              onJump={ds => setWeekStart(getMonday(new Date(ds + 'T12:00:00')))} />
          }
        </div>
      </main>

      {/* modals */}
      {showNew && <NewReservationModal onClose={() => setShowNew(false)} onSave={handleAdd} />}
      {edit && <EditReservationModal onClose={() => setEdit(null)} onSave={handleUpdate} initial={edit} />}
      {detail && !edit && (
        <DetailModal r={detail} onClose={() => setDetail(null)}
          onEdit={() => { setEdit(detail); setDetail(null); }}
          onDelete={() => handleDelete(detail)}
          onStatus={async ns => { await quickUpdate(detail, { status: ns }); }}
          onPayment={async np => { await quickUpdate(detail, { paymentType: np }); }} />
      )}

      {/* toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════ */
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('hotel_auth') === 'true');
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { sessionStorage.removeItem('hotel_auth'); setAuthed(false); }} />;
}
