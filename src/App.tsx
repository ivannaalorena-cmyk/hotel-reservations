import { useState, useEffect, useCallback } from 'react';
import {
  Reservation,
  RoomType,
  PaymentType,
  ROOM_TYPES,
  PAYMENT_TYPES,
  ROOM_PRICES,
  TOTAL_ROOMS,
  ROOM_ICONS,
  DAY_NAMES,
} from './types';
import { apiLogin, apiGetReservations, apiAddReservation, apiDeleteReservation } from './api';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('es-MX')} MXN`;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function getTodayStr(): string {
  return formatDate(new Date());
}

function getTomorrowStr(): string {
  return formatDate(addDays(new Date(), 1));
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await apiLogin(password);
    if (success) {
      sessionStorage.setItem('hotel_auth', 'true');
      onLogin();
    } else {
      setError('Contrasena incorrecta');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-bg-pattern" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🏨</div>
          <h1>Hotel Reservas</h1>
          <p>Sistema de Gestion de Reservaciones</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="password">Contrasena</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa la contrasena" autoFocus />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>{loading ? 'Verificando...' : 'Ingresar'}</button>
        </form>
      </div>
    </div>
  );
}

function AvailabilityPanel({ reservations, selectedDate }: { reservations: Reservation[]; selectedDate: string }) {
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach((rt) => (booked[rt] = 0));
  reservations.filter((r) => r.date === selectedDate).forEach((r) => { if (booked[r.roomType] !== undefined) booked[r.roomType]++; });
  const totalReservations = Object.values(booked).reduce((a, b) => a + b, 0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a, b) => a + b, 0);
  const totalAvailable = totalRooms - totalReservations;

  return (
    <div className="availability-panel">
      <div className="availability-header">
        <h3>Disponibilidad</h3>
        <span className="availability-date">{formatDateDisplay(selectedDate)}</span>
      </div>
      <div className="availability-summary">
        <div className="summary-stat"><span className="stat-number">{totalReservations}</span><span className="stat-label">Reservadas</span></div>
        <div className="summary-divider" />
        <div className="summary-stat"><span className="stat-number available">{totalAvailable}</span><span className="stat-label">Disponibles</span></div>
        <div className="summary-divider" />
        <div className="summary-stat"><span className="stat-number">{totalRooms}</span><span className="stat-label">Total</span></div>
      </div>
      <div className="room-types-grid">
        {ROOM_TYPES.map((rt) => {
          const available = TOTAL_ROOMS[rt] - booked[rt];
          const pct = (booked[rt] / TOTAL_ROOMS[rt]) * 100;
          return (
            <div key={rt} className="room-type-card">
              <div className="room-type-header"><span className="room-icon">{ROOM_ICONS[rt]}</span><span className="room-name">{rt}</span></div>
              <div className="room-bar-container"><div className="room-bar-fill" style={{ width: `${pct}%` }} data-full={available === 0 ? 'true' : 'false'} /></div>
              <div className="room-type-stats">
                <span className={`room-available ${available === 0 ? 'full' : ''}`}>{available === 0 ? 'Lleno' : `${available} disponible${available !== 1 ? 's' : ''}`}</span>
                <span className="room-count">{booked[rt]}/{TOTAL_ROOMS[rt]}</span>
              </div>
              <div className="room-price">{formatMXN(ROOM_PRICES[rt])}/noche</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewReservationModal({ onClose, onSave }: { onClose: () => void; onSave: (data: { name: string; employee: string; date: string; roomType: RoomType; paymentType: PaymentType }) => void }) {
  const [name, setName] = useState('');
  const [employee, setEmployee] = useState('');
  const [date, setDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PAYMENT_TYPES[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employee.trim() || !date) return;
    setSaving(true);
    await onSave({ name: name.trim(), employee: employee.trim(), date, roomType, paymentType });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Nueva Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="input-group"><label htmlFor="res-name">Nombre del Solicitante</label><input id="res-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required autoFocus /></div>
          <div className="input-group"><label htmlFor="res-employee">Nombre del Empleado</label><input id="res-employee" type="text" value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="Nombre del empleado" required /></div>
          <div className="input-group"><label htmlFor="res-date">Fecha</label><input id="res-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getTomorrowStr()} required /></div>
          <div className="input-group"><label htmlFor="res-room">Tipo de Habitacion</label>
            <select id="res-room" value={roomType} onChange={(e) => setRoomType(e.target.value as RoomType)}>
              {ROOM_TYPES.map((rt) => (<option key={rt} value={rt}>{ROOM_ICONS[rt]} {rt} — {formatMXN(ROOM_PRICES[rt])}</option>))}
            </select>
          </div>
          <div className="input-group"><label htmlFor="res-payment">Tipo de Pago</label>
            <select id="res-payment" value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
              {PAYMENT_TYPES.map((pt) => (<option key={pt} value={pt}>{pt === 'Tarjeta' ? '💳' : pt === 'Efectivo' ? '💵' : '⏳'} {pt}</option>))}
            </select>
          </div>
          <div className="reservation-preview"><span>Total:</span><span className="preview-price">{formatMXN(ROOM_PRICES[roomType])}</span></div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !name.trim() || !employee.trim() || !date}>{saving ? 'Guardando...' : 'Guardar Reservacion'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WeekView({ reservations, weekStart, onWeekChange, onSelectDate, selectedDate, onDelete }: { reservations: Reservation[]; weekStart: Date; onWeekChange: (dir: number) => void; onSelectDate: (date: string) => void; selectedDate: string; onDelete: (r: Reservation) => void }) {
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
                  <div key={r.id} className={`reservation-chip payment-${r.paymentType.toLowerCase().replace(' ', '-')}`}>
                    <div className="chip-top">
                      <span className="chip-name">{r.name}</span>
                      <button className="chip-delete" onClick={(e) => { e.stopPropagation(); onDelete(r); }} title="Eliminar">✕</button>
                    </div>
                    <span className="chip-room">{ROOM_ICONS[r.roomType]} {r.roomType}</span>
                    <span className="chip-employee">👤 {r.employee}</span>
                    <div className="chip-bottom">
                      <span className="chip-payment">{r.paymentType === 'Tarjeta' ? '💳' : r.paymentType === 'Efectivo' ? '💵' : '⏳'} {r.paymentType}</span>
                      <span className="chip-price">{formatMXN(r.price)}</span>
                    </div>
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

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [showModal, setShowModal] = useState(false);
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

  const handleAddReservation = async (data: { name: string; employee: string; date: string; roomType: RoomType; paymentType: PaymentType }) => {
    const result = await apiAddReservation(data);
    if (result.success) { showToast('Reservacion guardada correctamente'); setShowModal(false); fetchReservations(); }
    else { showToast(result.error || 'Error al guardar', 'error'); }
  };

  const handleDelete = async (r: Reservation) => {
    if (!confirm(`Eliminar reservacion de ${r.name}?`)) return;
    if (r.rowIndex) {
      const result = await apiDeleteReservation(r.rowIndex);
      if (result.success) { showToast('Reservacion eliminada'); fetchReservations(); }
      else { showToast('Error al eliminar', 'error'); }
    }
  };

  const weekTotal = reservations.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Reservas</h1></div>
        <div className="header-center">
          <div className="week-summary">
            <div className="summary-item"><span className="summary-value">{reservations.length}</span><span className="summary-label">Reservaciones</span></div>
            <div className="summary-sep" />
            <div className="summary-item"><span className="summary-value revenue">{formatMXN(weekTotal)}</span><span className="summary-label">Ingreso Semanal</span></div>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-primary btn-new" onClick={() => setShowModal(true)}>+ Nueva Reservacion</button>
          <button className="btn-ghost" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <main className="dashboard-body">
        <div className="main-content">
          {loading ? <div className="loading-state"><div className="spinner" /><p>Cargando reservaciones...</p></div> :
            <WeekView reservations={reservations} weekStart={weekStart} onWeekChange={(dir) => setWeekStart((prev) => addDays(prev, dir * 7))} onSelectDate={setSelectedDate} selectedDate={selectedDate} onDelete={handleDelete} />}
        </div>
        <aside className="sidebar"><AvailabilityPanel reservations={reservations} selectedDate={selectedDate} /></aside>
      </main>
      {showModal && <NewReservationModal onClose={() => setShowModal(false)} onSave={handleAddReservation} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✕'} {toast.message}</div>}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('hotel_auth') === 'true');
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { sessionStorage.removeItem('hotel_auth'); setAuthed(false); }} />;
}
