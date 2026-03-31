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

// ---- Utility Functions ----

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
  const now = new Date();
  return formatDate(now);
}

// Generate future dates for the date selector (next 90 days)
function getFutureDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 90; i++) {
    dates.push(formatDate(addDays(today, i)));
  }
  return dates;
}

// ---- Login Screen ----

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
      setError('Contraseña incorrecta');
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
          <p>Sistema de Gestión de Reservaciones</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la contraseña"
              autoFocus
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- Availability Card ----

function AvailabilityPanel({
  reservations,
  selectedDate,
}: {
  reservations: Reservation[];
  selectedDate: string;
}) {
  const booked: Record<string, number> = {};
  ROOM_TYPES.forEach((rt) => (booked[rt] = 0));

  reservations
    .filter((r) => r.date === selectedDate)
    .forEach((r) => {
      if (booked[r.roomType] !== undefined) booked[r.roomType]++;
    });

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
        <div className="summary-stat">
          <span className="stat-number">{totalReservations}</span>
          <span className="stat-label">Reservadas</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-stat">
          <span className="stat-number available">{totalAvailable}</span>
          <span className="stat-label">Disponibles</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-stat">
          <span className="stat-number">{totalRooms}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="room-types-grid">
        {ROOM_TYPES.map((rt) => {
          const available = TOTAL_ROOMS[rt] - booked[rt];
          const pct = (booked[rt] / TOTAL_ROOMS[rt]) * 100;
          return (
            <div key={rt} className="room-type-card">
              <div className="room-type-header">
                <span className="room-icon">{ROOM_ICONS[rt]}</span>
                <span className="room-name">{rt}</span>
              </div>
              <div className="room-bar-container">
                <div
                  className="room-bar-fill"
                  style={{ width: `${pct}%` }}
                  data-full={available === 0 ? 'true' : 'false'}
                />
              </div>
              <div className="room-type-stats">
                <span className={`room-available ${available === 0 ? 'full' : ''}`}>
                  {available === 0 ? 'Lleno' : `${available} disponible${available !== 1 ? 's' : ''}`}
                </span>
                <span className="room-count">
                  {booked[rt]}/{TOTAL_ROOMS[rt]}
                </span>
              </div>
              <div className="room-price">{formatMXN(ROOM_PRICES[rt])}/noche</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- New Reservation Modal ----

function NewReservationModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: { name: string; date: string; roomType: RoomType; paymentType: PaymentType }) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>(ROOM_TYPES[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PAYMENT_TYPES[0]);
  const [saving, setSaving] = useState(false);

  const futureDates = getFutureDates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    setSaving(true);
    await onSave({ name: name.trim(), date, roomType, paymentType });
    setSaving(false);
  };

  const price = ROOM_PRICES[roomType];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Reservación</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="res-name">Nombre del Solicitante</label>
            <input
              id="res-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="res-date">Fecha</label>
            <select
              id="res-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            >
              <option value="">Seleccionar fecha</option>
              {futureDates.map((d) => {
                const dt = new Date(d + 'T12:00:00');
                const dayName = DAY_NAMES[dt.getDay()];
                return (
                  <option key={d} value={d}>
                    {dayName} {formatDateDisplay(d)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="res-room">Tipo de Habitación</label>
            <select
              id="res-room"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
            >
              {ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {ROOM_ICONS[rt]} {rt} — {formatMXN(ROOM_PRICES[rt])}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="res-payment">Tipo de Pago</label>
            <select
              id="res-payment"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            >
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt === 'Tarjeta' ? '💳' : pt === 'Efectivo' ? '💵' : '⏳'} {pt}
                </option>
              ))}
            </select>
          </div>

          <div className="reservation-preview">
            <span>Total:</span>
            <span className="preview-price">{formatMXN(price)}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !name.trim() || !date}>
              {saving ? 'Guardando...' : 'Guardar Reservación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Week View ----

function WeekView({
  reservations,
  weekStart,
  onWeekChange,
  onSelectDate,
  selectedDate,
  onDelete,
}: {
  reservations: Reservation[];
  weekStart: Date;
  onWeekChange: (dir: number) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
  onDelete: (r: Reservation) => void;
}) {
  const days = getWeekDays(weekStart);
  const todayStr = getTodayStr();

  // Group reservations by date
  const byDate: Record<string, Reservation[]> = {};
  days.forEach((d) => {
    const ds = formatDate(d);
    byDate[ds] = reservations.filter((r) => r.date === ds);
  });

  const weekLabel = `${formatDateDisplay(formatDate(days[0]))} — ${formatDateDisplay(formatDate(days[6]))}`;

  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-nav" onClick={() => onWeekChange(-1)}>
          ←
        </button>
        <h2 className="week-label">{weekLabel}</h2>
        <button className="btn-nav" onClick={() => onWeekChange(1)}>
          →
        </button>
      </div>

      <div className="week-grid">
        {days.map((d) => {
          const ds = formatDate(d);
          const dayReservations = byDate[ds] || [];
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const dayTotal = dayReservations.reduce((sum, r) => sum + r.price, 0);
          const totalBooked = dayReservations.length;

          return (
            <div
              key={ds}
              className={`day-column ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDate(ds)}
            >
              <div className="day-header">
                <span className="day-name">{DAY_NAMES[d.getDay()]}</span>
                <span className="day-date">{d.getDate()}</span>
                {isToday && <span className="today-badge">Hoy</span>}
              </div>

              <div className="day-stats">
                <span className="day-count">{totalBooked} reservación{totalBooked !== 1 ? 'es' : ''}</span>
                {dayTotal > 0 && <span className="day-total">{formatMXN(dayTotal)}</span>}
              </div>

              <div className="day-reservations">
                {dayReservations.map((r) => (
                  <div key={r.id} className={`reservation-chip payment-${r.paymentType.toLowerCase().replace(' ', '-')}`}>
                    <div className="chip-top">
                      <span className="chip-name">{r.name}</span>
                      <button
                        className="chip-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(r);
                        }}
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                    <span className="chip-room">{ROOM_ICONS[r.roomType]} {r.roomType}</span>
                    <div className="chip-bottom">
                      <span className="chip-payment">
                        {r.paymentType === 'Tarjeta' ? '💳' : r.paymentType === 'Efectivo' ? '💵' : '⏳'}{' '}
                        {r.paymentType}
                      </span>
                      <span className="chip-price">{formatMXN(r.price)}</span>
                    </div>
                  </div>
                ))}
                {dayReservations.length === 0 && (
                  <div className="empty-day">Sin reservaciones</div>
                )}
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
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const startDate = formatDate(weekStart);
    const endDate = formatDate(addDays(weekStart, 6));
    const data = await apiGetReservations(startDate, endDate);
    setReservations(data);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleWeekChange = (dir: number) => {
    setWeekStart((prev) => addDays(prev, dir * 7));
  };

  const handleAddReservation = async (data: {
    name: string;
    date: string;
    roomType: RoomType;
    paymentType: PaymentType;
  }) => {
    const result = await apiAddReservation(data);
    if (result.success) {
      showToast('Reservación guardada correctamente');
      setShowModal(false);
      fetchReservations();
    } else {
      showToast(result.error || 'Error al guardar', 'error');
    }
  };

  const handleDelete = async (r: Reservation) => {
    if (!confirm(`¿Eliminar reservación de ${r.name}?`)) return;
    if (r.rowIndex) {
      const result = await apiDeleteReservation(r.rowIndex);
      if (result.success) {
        showToast('Reservación eliminada');
        fetchReservations();
      } else {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  // Week totals
  const weekTotal = reservations.reduce((sum, r) => sum + r.price, 0);
  const weekCount = reservations.length;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">🏨</span> Hotel Reservas
          </h1>
        </div>
        <div className="header-center">
          <div className="week-summary">
            <div className="summary-item">
              <span className="summary-value">{weekCount}</span>
              <span className="summary-label">Reservaciones</span>
            </div>
            <div className="summary-sep" />
            <div className="summary-item">
              <span className="summary-value revenue">{formatMXN(weekTotal)}</span>
              <span className="summary-label">Ingreso Semanal</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-primary btn-new" onClick={() => setShowModal(true)}>
            + Nueva Reservación
          </button>
          <button className="btn-ghost" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="dashboard-body">
        <div className="main-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Cargando reservaciones...</p>
            </div>
          ) : (
            <WeekView
              reservations={reservations}
              weekStart={weekStart}
              onWeekChange={handleWeekChange}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
              onDelete={handleDelete}
            />
          )}
        </div>
        <aside className="sidebar">
          <AvailabilityPanel reservations={reservations} selectedDate={selectedDate} />
        </aside>
      </main>

      {showModal && (
        <NewReservationModal onClose={() => setShowModal(false)} onSave={handleAddReservation} />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
}

// ---- App Root ----

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('hotel_auth') === 'true');

  const handleLogout = () => {
    sessionStorage.removeItem('hotel_auth');
    setAuthed(false);
  };

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
