import { useState, useEffect, useCallback } from 'react';
import {
  Reservation,
  RoomType,
  PaymentType,
  ReservationStatus,
  ROOM_TYPES,
  PAYMENT_TYPES,
  STATUSES,
  ROOM_PRICES,
  TOTAL_ROOMS,
  PEOPLE_OPTIONS,
  DAY_NAMES,
} from './types';
import { apiLogin, apiGetReservations, apiAddReservation, apiUpdateReservation, apiDeleteReservation } from './api';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(date: Date, days: number): Date { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
function formatDate(date: Date): string { return date.toISOString().split('T')[0]; }
function formatDateDisplay(dateStr: string): string { const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; }
function formatMXN(amount: number): string { return `$${amount.toLocaleString('es-MX')} MXN`; }
function getWeekDays(monday: Date): Date[] { return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }
function getTodayStr(): string { return formatDate(new Date()); }
function getTomorrowStr(): string { return formatDate(addDays(new Date(), 1)); }

// ---- Login ----
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const success = await apiLogin(password);
    if (success) { sessionStorage.setItem('hotel_auth', 'true'); onLogin(); } else { setError('Contrasena incorrecta'); }
    setLoading(false);
  };
  return (
    <div className="login-container"><div className="login-bg-pattern" /><div className="login-card"><div className="login-header"><div className="login-icon">🏨</div><h1>Hotel Ancira</h1><p>Sistema de Gestion de Reservaciones</p></div>
      <form onSubmit={handleSubmit}><div className="input-group"><label htmlFor="password">Contrasena</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa la contrasena" autoFocus /></div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn-primary btn-full" disabled={loading}>{loading ? 'Verificando...' : 'Ingresar'}</button>
      </form></div></div>
  );
}

// ---- Availability ----
function AvailabilityPanel({ reservations, selectedDate }: { reservations: Reservation[]; selectedDate: string }) {
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach((rt) => (booked[rt] = 0));
  reservations.filter((r) => r.date === selectedDate).forEach((r) => { if (booked[r.roomType] !== undefined) booked[r.roomType]++; });
  const totalReservations = Object.values(booked).reduce((a, b) => a + b, 0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a, b) => a + b, 0);
  return (
    <div className="availability-panel">
      <div className="availability-header"><h3>Disponibilidad</h3><span className="availability-date">{formatDateDisplay(selectedDate)}</span></div>
      <div className="availability-summary">
        <div className="summary-stat"><span className="stat-number">{totalReservations}</span><span className="stat-label">Reservadas</span></div>
        <div className="summary-divider" />
        <div className="summary-stat"><span className="stat-number available">{totalRooms - totalReservations}</span><span className="stat-label">Disponibles</span></div>
        <div className="summary-divider" />
        <div className="summary-stat"><span className="stat-number">{totalRooms}</span><span className="stat-label">Total</span></div>
      </div>
      <div className="room-types-grid">
        {ROOM_TYPES.map((rt) => {
          const available = TOTAL_ROOMS[rt] - booked[rt];
          const pct = (booked[rt] / TOTAL_ROOMS[rt]) * 100;
          return (
            <div key={rt} className="room-type-card">
              <div className="room-type-header"><span className="room-name">{rt}</span></div>
              <div className="room-bar-container"><div className="room-bar-fill" style={{ width: `${pct}%` }} data-full={available === 0 ? 'true' : 'false'} /></div>
              <div className="room-type-stats"><span className={`room-available ${available === 0 ? 'full' : ''}`}>{available === 0 ? 'Lleno' : `${available} disponible${available !== 1 ? 's' : ''}`}</span><span className="room-count">{booked[rt]}/{TOTAL_ROOMS[rt]}</span></div>
              <div className="room-price">{formatMXN(ROOM_PRICES[rt])}/noche</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Reservation Form (New + Edit) ----
function ReservationFormModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (data: { name: string; employee: string; phone: string; email: string; date: string; roomType: RoomType; numPeople: number; roomNumber: string; paymentType: PaymentType; anticipoPaid: boolean; status?: ReservationStatus }) => void;
  initial?: Reservation | null;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [employee, setEmployee] = useState(initial?.employee || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [date, setDate] = useState(initial?.date || '');
  const [roomType, setRoomType] = useState<RoomType>(initial?.roomType || ROOM_TYPES[0]);
  const [numPeople, setNumPeople] = useState<number>(initial?.numPeople || PEOPLE_OPTIONS[ROOM_TYPES[0]][0]);
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber || '');
  const [paymentType, setPaymentType] = useState<PaymentType>(initial?.paymentType || PAYMENT_TYPES[0]);
  const [anticipoPaid, setAnticipoPaid] = useState(initial?.anticipoPaid || false);
  const [status, setStatus] = useState<ReservationStatus>(initial?.status || 'Reserva');
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  const handleRoomTypeChange = (rt: RoomType) => {
    setRoomType(rt);
    const opts = PEOPLE_OPTIONS[rt];
    if (!opts.includes(numPeople)) setNumPeople(opts[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employee.trim() || !date) return;
    setSaving(true);
    await onSave({ name: name.trim(), employee: employee.trim(), phone: phone.trim(), email: email.trim(), date, roomType, numPeople, roomNumber: roomNumber.trim(), paymentType, anticipoPaid, status });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>{isEdit ? 'Editar Reservacion' : 'Nueva Reservacion'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required autoFocus /></div>
            <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="Nombre del empleado" required /></div>
            <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero de telefono" /></div>
            <div className="input-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="input-group"><label>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={isEdit ? undefined : getTomorrowStr()} required /></div>
            <div className="input-group"><label>Numero de Cuarto</label><input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Ej: 101, 205" /></div>
            <div className="input-group"><label>Tipo de Habitacion</label>
              <select value={roomType} onChange={(e) => handleRoomTypeChange(e.target.value as RoomType)}>
                {ROOM_TYPES.map((rt) => (<option key={rt} value={rt}>{rt} - {formatMXN(ROOM_PRICES[rt])}</option>))}
              </select>
            </div>
            <div className="input-group"><label>Numero de Personas</label>
              <select value={numPeople} onChange={(e) => setNumPeople(Number(e.target.value))}>
                {PEOPLE_OPTIONS[roomType].map((n) => (<option key={n} value={n}>{n} persona{n !== 1 ? 's' : ''}</option>))}
              </select>
            </div>
            <div className="input-group"><label>Tipo de Pago</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                {PAYMENT_TYPES.map((pt) => (<option key={pt} value={pt}>{pt}</option>))}
              </select>
            </div>
            {isEdit && (
              <div className="input-group"><label>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)}>
                  {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            )}
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={anticipoPaid} onChange={(e) => setAnticipoPaid(e.target.checked)} />
              <span>Dio anticipo del 50% del pago total?</span>
            </label>
          </div>
          <div className="reservation-preview"><span>Total:</span><span className="preview-price">{formatMXN(ROOM_PRICES[roomType])}</span></div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !name.trim() || !employee.trim() || !date}>{saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar Reservacion')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Detail Modal ----
function ReservationDetailModal({ reservation, onClose, onEdit, onDelete, onStatusChange, onPaymentChange }: {
  reservation: Reservation; onClose: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: ReservationStatus) => void; onPaymentChange: (payment: PaymentType) => void;
}) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingPayment, setChangingPayment] = useState(false);
  const newStatus = reservation.status === 'Reserva' ? 'Check-in' : 'Reserva';
  const handleStatusToggle = async () => { setChangingStatus(true); await onStatusChange(newStatus as ReservationStatus); setChangingStatus(false); };
  const handlePaymentChange = async (pt: PaymentType) => { setChangingPayment(true); await onPaymentChange(pt); setChangingPayment(false); };
  const isPagoFaltante = reservation.paymentType === 'Pago Faltante';
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Detalle de Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="detail-status-row">
          <div className={`detail-status-badge status-${reservation.status.toLowerCase().replace('-','')}`}>{reservation.status}</div>
          <button className="btn-status-toggle" onClick={handleStatusToggle} disabled={changingStatus}>{changingStatus ? 'Cambiando...' : `Cambiar a ${newStatus}`}</button>
        </div>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Nombre</span><span className="detail-value">{reservation.name}</span></div>
          <div className="detail-row"><span className="detail-label">Empleado</span><span className="detail-value">{reservation.employee}</span></div>
          <div className="detail-row"><span className="detail-label">Telefono</span><span className="detail-value">{reservation.phone || 'No registrado'}</span></div>
          <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{reservation.email || 'No registrado'}</span></div>
          <div className="detail-row"><span className="detail-label">Fecha</span><span className="detail-value">{formatDateDisplay(reservation.date)}</span></div>
          <div className="detail-row"><span className="detail-label">Habitacion</span><span className="detail-value">{reservation.roomType}</span></div>
          <div className="detail-row"><span className="detail-label">Cuarto #</span><span className="detail-value">{reservation.roomNumber || 'No asignado'}</span></div>
          <div className="detail-row"><span className="detail-label">Personas</span><span className="detail-value">{reservation.numPeople}</span></div>
          <div className="detail-row"><span className="detail-label">Anticipo 50%</span><span className="detail-value">{reservation.anticipoPaid ? 'Si' : 'No'}</span></div>
          <div className="detail-row"><span className="detail-label">Precio</span><span className="detail-value detail-price">{formatMXN(reservation.price)}</span></div>
        </div>
        <div className="detail-payment-row">
          <span className="detail-label">Pago: <strong>{reservation.paymentType}</strong></span>
          {isPagoFaltante && (
            <div className="payment-change-buttons">
              <button className="btn-payment-change tarjeta" onClick={() => handlePaymentChange('Tarjeta')} disabled={changingPayment}>Cambiar a Tarjeta</button>
              <button className="btn-payment-change efectivo" onClick={() => handlePaymentChange('Efectivo')} disabled={changingPayment}>Cambiar a Efectivo</button>
            </div>
          )}
        </div>
        <div className="modal-actions"><button className="btn-danger" onClick={onDelete}>Eliminar</button><button className="btn-primary" onClick={onEdit}>Editar</button></div>
      </div>
    </div>
  );
}

// ---- Week View ----
function WeekView({ reservations, weekStart, onWeekChange, onSelectDate, selectedDate, onClickReservation }: {
  reservations: Reservation[]; weekStart: Date; onWeekChange: (dir: number) => void; onSelectDate: (date: string) => void; selectedDate: string; onClickReservation: (r: Reservation) => void;
}) {
  const days = getWeekDays(weekStart);
  const todayStr = getTodayStr();
  const byDate: Record<string, Reservation[]> = {};
  days.forEach((d) => { byDate[formatDate(d)] = reservations.filter((r) => r.date === formatDate(d)); });
  const weekLabel = `${formatDateDisplay(formatDate(days[0]))} — ${formatDateDisplay(formatDate(days[6]))}`;

  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-nav" onClick={() => onWeekChange(-1)}>←</button>
        <h2 className="week-label">{weekLabel}</h2>
        <button className="btn-nav" onClick={() => onWeekChange(1)}>→</button>
      </div>
      <div className="week-grid">
        {days.map((d) => {
          const ds = formatDate(d);
          const dayRes = byDate[ds] || [];
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const dayTotal = dayRes.reduce((sum, r) => sum + r.price, 0);
          return (
            <div key={ds} className={`day-column ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => onSelectDate(ds)}>
              <div className="day-header">
                <span className="day-name">{DAY_NAMES[d.getDay()]}</span>
                <span className="day-date">{d.getDate()}</span>
                {isToday && <span className="today-badge">Hoy</span>}
              </div>
              <div className="day-stats">
                <span className="day-count">{dayRes.length} reservacion{dayRes.length !== 1 ? 'es' : ''}</span>
                {dayTotal > 0 && <span className="day-total">{formatMXN(dayTotal)}</span>}
              </div>
              <div className="day-reservations">
                {dayRes.map((r) => (
                  <div key={r.id}
                    className={`reservation-chip payment-${r.paymentType.toLowerCase().replace(' ', '-')} ${r.status === 'Check-in' ? 'status-checkin' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onClickReservation(r); }}>
                    <div className="chip-top"><span className="chip-name">{r.name}</span><span className={`chip-status-dot status-${r.status.toLowerCase().replace('-','')}`} /></div>
                    <span className="chip-room">{r.roomType}{r.roomNumber ? ` - #${r.roomNumber}` : ''}</span>
                    <div className="chip-bottom"><span className="chip-payment">{r.paymentType}</span><span className="chip-price">{formatMXN(r.price)}</span></div>
                  </div>
                ))}
                {dayRes.length === 0 && <div className="empty-day">Sin reservaciones</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Dashboard ----
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [showNewModal, setShowNewModal] = useState(false);
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const data = await apiGetReservations(formatDate(weekStart), formatDate(addDays(weekStart, 6)));
    setReservations(data);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const handleAdd = async (data: { name: string; employee: string; phone: string; email: string; date: string; roomType: RoomType; numPeople: number; roomNumber: string; paymentType: PaymentType; anticipoPaid: boolean }) => {
    const result = await apiAddReservation(data);
    if (result.success) { showToast('Reservacion guardada'); setShowNewModal(false); fetchReservations(); }
    else { showToast(result.error || 'Error al guardar', 'error'); }
  };

  const handleUpdate = async (data: { name: string; employee: string; phone: string; email: string; date: string; roomType: RoomType; numPeople: number; roomNumber: string; paymentType: PaymentType; anticipoPaid: boolean; status?: ReservationStatus }) => {
    if (!editReservation?.rowIndex) return;
    const result = await apiUpdateReservation({ ...data, rowIndex: editReservation.rowIndex, status: data.status || 'Reserva' });
    if (result.success) { showToast('Reservacion actualizada'); setEditReservation(null); fetchReservations(); }
    else { showToast(result.error || 'Error al actualizar', 'error'); }
  };

  const handleDelete = async (r: Reservation) => {
    if (!confirm(`Eliminar reservacion de ${r.name}?`)) return;
    if (r.rowIndex) {
      const result = await apiDeleteReservation(r.rowIndex);
      if (result.success) { showToast('Reservacion eliminada'); setDetailReservation(null); fetchReservations(); }
      else { showToast('Error al eliminar', 'error'); }
    }
  };

  const weekTotal = reservations.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira</h1></div>
        <div className="header-center">
          <div className="week-summary">
            <div className="summary-item"><span className="summary-value">{reservations.length}</span><span className="summary-label">Reservaciones</span></div>
            <div className="summary-sep" />
            <div className="summary-item"><span className="summary-value revenue">{formatMXN(weekTotal)}</span><span className="summary-label">Ingreso Semanal</span></div>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-primary btn-new" onClick={() => setShowNewModal(true)}>+ Nueva Reservacion</button>
          <button className="btn-ghost" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <main className="dashboard-body">
        <div className="main-content">
          {loading ? <div className="loading-state"><div className="spinner" /><p>Cargando reservaciones...</p></div> :
            <WeekView reservations={reservations} weekStart={weekStart} onWeekChange={(dir) => setWeekStart((prev) => addDays(prev, dir * 7))} onSelectDate={setSelectedDate} selectedDate={selectedDate} onClickReservation={setDetailReservation} />}
        </div>
        <aside className="sidebar"><AvailabilityPanel reservations={reservations} selectedDate={selectedDate} /></aside>
      </main>
      {showNewModal && <ReservationFormModal onClose={() => setShowNewModal(false)} onSave={handleAdd} />}
      {editReservation && <ReservationFormModal onClose={() => setEditReservation(null)} onSave={handleUpdate} initial={editReservation} />}
      {detailReservation && !editReservation && (
        <ReservationDetailModal reservation={detailReservation} onClose={() => setDetailReservation(null)}
          onEdit={() => { setEditReservation(detailReservation); setDetailReservation(null); }}
          onDelete={() => handleDelete(detailReservation)}
          onStatusChange={async (newStatus) => {
            if (!detailReservation.rowIndex) return;
            const result = await apiUpdateReservation({ rowIndex: detailReservation.rowIndex, name: detailReservation.name, employee: detailReservation.employee, phone: detailReservation.phone, email: detailReservation.email, date: detailReservation.date, roomType: detailReservation.roomType, numPeople: detailReservation.numPeople, roomNumber: detailReservation.roomNumber, paymentType: detailReservation.paymentType, anticipoPaid: detailReservation.anticipoPaid, status: newStatus });
            if (result.success) { showToast('Estado actualizado'); setDetailReservation(null); fetchReservations(); }
            else { showToast('Error al actualizar', 'error'); }
          }}
          onPaymentChange={async (newPayment) => {
            if (!detailReservation.rowIndex) return;
            const result = await apiUpdateReservation({ rowIndex: detailReservation.rowIndex, name: detailReservation.name, employee: detailReservation.employee, phone: detailReservation.phone, email: detailReservation.email, date: detailReservation.date, roomType: detailReservation.roomType, numPeople: detailReservation.numPeople, roomNumber: detailReservation.roomNumber, paymentType: newPayment, anticipoPaid: detailReservation.anticipoPaid, status: detailReservation.status });
            if (result.success) { showToast('Tipo de pago actualizado'); setDetailReservation(null); fetchReservations(); }
            else { showToast('Error al actualizar', 'error'); }
          }} />
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('hotel_auth') === 'true');
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { sessionStorage.removeItem('hotel_auth'); setAuthed(false); }} />;
}
