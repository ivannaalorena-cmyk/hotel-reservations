import { useState, useEffect, useCallback } from 'react';
import { Reservation, RoomType, PaymentType, ReservationStatus, ROOM_TYPES, PAYMENT_TYPES, STATUSES, ROOM_PRICES, TOTAL_ROOMS, PEOPLE_OPTIONS, ROOM_MAP, ROOM_TYPE_GROUPS, DAY_NAMES } from './types';
import { apiLogin, apiGetReservations, apiAddReservation, apiUpdateReservation, apiDeleteReservation } from './api';

function getMonday(d: Date): Date { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); date.setDate(diff); date.setHours(0,0,0,0); return date; }
function addDays(date: Date, days: number): Date { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
function formatDate(date: Date): string { return date.toISOString().split('T')[0]; }
function formatDateDisplay(ds: string): string { const [y,m,d] = ds.split('-'); return `${d}/${m}/${y}`; }
function formatMXN(n: number): string { return `$${n.toLocaleString('es-MX')} MXN`; }
function getWeekDays(mon: Date): Date[] { return Array.from({length:7},(_,i)=>addDays(mon,i)); }
function getTodayStr(): string { return formatDate(new Date()); }
function getTomorrowStr(): string { return formatDate(addDays(new Date(),1)); }

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError(''); const ok = await apiLogin(password); if(ok){sessionStorage.setItem('hotel_auth','true');onLogin();}else{setError('Contrasena incorrecta');} setLoading(false); };
  return (
    <div className="login-container"><div className="login-bg-pattern"/><div className="login-card"><div className="login-header"><div className="login-icon">🏨</div><h1>Hotel Ancira</h1><p>Sistema de Gestion de Reservaciones</p></div>
    <form onSubmit={handleSubmit}><div className="input-group"><label>Contrasena</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresa la contrasena" autoFocus/></div>
    {error&&<div className="error-msg">{error}</div>}
    <button type="submit" className="btn-primary btn-full" disabled={loading}>{loading?'Verificando...':'Ingresar'}</button></form></div></div>
  );
}

function AvailabilityPanel({ reservations, selectedDate }: { reservations: Reservation[]; selectedDate: string }) {
  const booked: Record<string,number> = {}; ROOM_TYPES.forEach(rt=>(booked[rt]=0));
  reservations.filter(r=>r.date===selectedDate).forEach(r=>{ if(booked[r.roomType]!==undefined) booked[r.roomType]++; });
  const totalRes = Object.values(booked).reduce((a,b)=>a+b,0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a,b)=>a+b,0);
  return (
    <div className="availability-panel">
      <div className="avail-title">Disponibilidad</div>
      <div className="avail-date">{formatDateDisplay(selectedDate)}</div>
      <div className="avail-summary">
        <div className="avail-stat"><span className="avail-num">{totalRes}</span><span className="avail-lbl">Ocupadas</span></div>
        <div className="avail-stat"><span className="avail-num green">{totalRooms-totalRes}</span><span className="avail-lbl">Libres</span></div>
        <div className="avail-stat"><span className="avail-num">{totalRooms}</span><span className="avail-lbl">Total</span></div>
      </div>
      <div className="avail-types">
        {ROOM_TYPES.map(rt => {
          const avail = TOTAL_ROOMS[rt]-booked[rt]; const pct = (booked[rt]/TOTAL_ROOMS[rt])*100;
          return (<div key={rt} className="avail-type-row">
            <div className="avail-type-name">{rt}</div>
            <div className="avail-type-bar"><div className="avail-type-fill" style={{width:`${pct}%`}} data-full={avail===0?'true':'false'}/></div>
            <div className="avail-type-nums"><span className={avail===0?'full':''}>{avail===0?'Lleno':`${avail} libres`}</span><span className="muted">{booked[rt]}/{TOTAL_ROOMS[rt]}</span></div>
          </div>);
        })}
      </div>
    </div>
  );
}

function ReservationFormModal({ onClose, onSave, initial }: { onClose:()=>void; onSave:(data:any)=>void; initial?:Reservation|null; }) {
  const [name,setName]=useState(initial?.name||'');
  const [employee,setEmployee]=useState(initial?.employee||'');
  const [phone,setPhone]=useState(initial?.phone||'');
  const [email,setEmail]=useState(initial?.email||'');
  const [date,setDate]=useState(initial?.date||'');
  const [roomType,setRoomType]=useState<RoomType>(initial?.roomType||ROOM_TYPES[0]);
  const [numPeople,setNumPeople]=useState<number>(initial?.numPeople||PEOPLE_OPTIONS[ROOM_TYPES[0]][0]);
  const [roomNumber,setRoomNumber]=useState(initial?.roomNumber||'');
  const [paymentType,setPaymentType]=useState<PaymentType>(initial?.paymentType||PAYMENT_TYPES[0]);
  const [anticipoPaid,setAnticipoPaid]=useState(initial?.anticipoPaid||false);
  const [status,setStatus]=useState<ReservationStatus>(initial?.status||'Reserva');
  const [saving,setSaving]=useState(false);
  const isEdit=!!initial;
  const handleRoomTypeChange=(rt:RoomType)=>{setRoomType(rt);const opts=PEOPLE_OPTIONS[rt];if(!opts.includes(numPeople))setNumPeople(opts[0]);};
  const handleSubmit=async(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||!employee.trim()||!date)return;setSaving(true);await onSave({name:name.trim(),employee:employee.trim(),phone:phone.trim(),email:email.trim(),date,roomType,numPeople,roomNumber:roomNumber.trim(),paymentType,anticipoPaid,status});setSaving(false);};
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-large" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h2>{isEdit?'Editar Reservacion':'Nueva Reservacion'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre completo" required autoFocus/></div>
          <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e=>setEmployee(e.target.value)} placeholder="Nombre del empleado" required/></div>
          <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numero de telefono"/></div>
          <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com"/></div>
          <div className="input-group"><label>Fecha</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} min={isEdit?undefined:getTomorrowStr()} required/></div>
          <div className="input-group"><label>Numero de Cuarto</label><input type="text" value={roomNumber} onChange={e=>setRoomNumber(e.target.value)} placeholder="Ej: 1, 15, 29"/></div>
          <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e=>handleRoomTypeChange(e.target.value as RoomType)}>{ROOM_TYPES.map(rt=>(<option key={rt} value={rt}>{rt} - {formatMXN(ROOM_PRICES[rt])}</option>))}</select></div>
          <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e=>setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n=>(<option key={n} value={n}>{n} persona{n!==1?'s':''}</option>))}</select></div>
          <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e=>setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt=>(<option key={pt} value={pt}>{pt}</option>))}</select></div>
          {isEdit&&<div className="input-group"><label>Estado</label><select value={status} onChange={e=>setStatus(e.target.value as ReservationStatus)}>{STATUSES.map(s=>(<option key={s} value={s}>{s}</option>))}</select></div>}
        </div>
        <div className="checkbox-group"><label className="checkbox-label"><input type="checkbox" checked={anticipoPaid} onChange={e=>setAnticipoPaid(e.target.checked)}/><span>Dio anticipo del 50% del pago total?</span></label></div>
        <div className="reservation-preview"><span>Total:</span><span className="preview-price">{formatMXN(ROOM_PRICES[roomType])}</span></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving||!name.trim()||!employee.trim()||!date}>{saving?'Guardando...':(isEdit?'Actualizar':'Guardar Reservacion')}</button></div>
      </form>
    </div></div>
  );
}

function ReservationDetailModal({ reservation, onClose, onEdit, onDelete, onStatusChange, onPaymentChange }: { reservation:Reservation; onClose:()=>void; onEdit:()=>void; onDelete:()=>void; onStatusChange:(s:ReservationStatus)=>void; onPaymentChange:(p:PaymentType)=>void; }) {
  const [changingStatus,setChangingStatus]=useState(false);
  const [changingPayment,setChangingPayment]=useState(false);
  const newStatus = reservation.status==='Reserva'?'Check-in':'Reserva';
  const isPF = reservation.paymentType==='Pago Faltante';
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h2>Detalle de Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="detail-status-row">
        <div className={`detail-status-badge status-${reservation.status.toLowerCase().replace('-','')}`}>{reservation.status}</div>
        <button className="btn-status-toggle" onClick={async()=>{setChangingStatus(true);await onStatusChange(newStatus as ReservationStatus);setChangingStatus(false);}} disabled={changingStatus}>{changingStatus?'Cambiando...':`Cambiar a ${newStatus}`}</button>
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Nombre</span><span className="detail-value">{reservation.name}</span></div>
        <div className="detail-row"><span className="detail-label">Empleado</span><span className="detail-value">{reservation.employee}</span></div>
        <div className="detail-row"><span className="detail-label">Telefono</span><span className="detail-value">{reservation.phone||'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{reservation.email||'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Fecha</span><span className="detail-value">{formatDateDisplay(reservation.date)}</span></div>
        <div className="detail-row"><span className="detail-label">Habitacion</span><span className="detail-value">{reservation.roomType}</span></div>
        <div className="detail-row"><span className="detail-label">Cuarto #</span><span className="detail-value">{reservation.roomNumber||'No asignado'}</span></div>
        <div className="detail-row"><span className="detail-label">Personas</span><span className="detail-value">{reservation.numPeople}</span></div>
        <div className="detail-row"><span className="detail-label">Anticipo 50%</span><span className="detail-value">{reservation.anticipoPaid?'Si':'No'}</span></div>
        <div className="detail-row"><span className="detail-label">Precio</span><span className="detail-value detail-price">{formatMXN(reservation.price)}</span></div>
      </div>
      <div className="detail-payment-row">
        <span className="detail-label">Pago: <strong>{reservation.paymentType}</strong></span>
        {isPF&&<div className="payment-change-buttons">
          <button className="btn-payment-change tarjeta" onClick={async()=>{setChangingPayment(true);await onPaymentChange('Tarjeta');setChangingPayment(false);}} disabled={changingPayment}>Cambiar a Tarjeta</button>
          <button className="btn-payment-change efectivo" onClick={async()=>{setChangingPayment(true);await onPaymentChange('Efectivo');setChangingPayment(false);}} disabled={changingPayment}>Cambiar a Efectivo</button>
        </div>}
      </div>
      <div className="modal-actions"><button className="btn-danger" onClick={onDelete}>Eliminar</button><button className="btn-primary" onClick={onEdit}>Editar</button></div>
    </div></div>
  );
}

function RoomGrid({ reservations, selectedDate, onClickReservation }: { reservations:Reservation[]; selectedDate:string; onClickReservation:(r:Reservation)=>void; }) {
  const dayRes = reservations.filter(r=>r.date===selectedDate);
  const roomToRes: Record<string, Reservation> = {};
  const unassigned: Reservation[] = [];
  dayRes.forEach(r => { if(r.roomNumber && !isNaN(Number(r.roomNumber))) { roomToRes[r.roomNumber] = r; } else { unassigned.push(r); } });
  const dayTotal = dayRes.reduce((s,r)=>s+r.price,0);

  return (
    <div className="room-grid-container">
      <div className="day-info-bar">
        <div className="day-info-date">{formatDateDisplay(selectedDate)} - {DAY_NAMES[new Date(selectedDate+'T12:00:00').getDay()]}</div>
        <div className="day-info-stats"><span>{dayRes.length} reservacion{dayRes.length!==1?'es':''}</span><span className="day-info-total">{formatMXN(dayTotal)}</span></div>
      </div>
      {ROOM_TYPE_GROUPS.map(group => (
        <div key={group.type} className="room-group">
          <div className="room-group-header">{group.label} <span className="room-group-price">{formatMXN(ROOM_PRICES[group.type])}/noche</span></div>
          <div className="room-boxes">
            {group.rooms.map(num => {
              const res = roomToRes[num.toString()];
              const isPF = res?.paymentType==='Pago Faltante';
              const isCheckin = res?.status==='Check-in';
              if(res) return (
                <div key={num} className={`room-box occupied ${isPF?'pago-faltante':''} ${isCheckin?'checkin':''}`} onClick={()=>onClickReservation(res)}>
                  <div className="room-box-top"><span className="room-box-num">#{num}</span><span className={`room-box-dot status-${(res.status||'Reserva').toLowerCase().replace('-','')}`}/></div>
                  <div className="room-box-name">{res.name}</div>
                  <div className="room-box-payment">{res.paymentType}</div>
                </div>
              );
              return (
                <div key={num} className="room-box empty">
                  <span className="room-box-num-large">{num}</span>
                  <span className="room-box-type">{ROOM_MAP[num-1].typeShort}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {unassigned.length>0&&(
        <div className="room-group">
          <div className="room-group-header">Sin cuarto asignado ({unassigned.length})</div>
          <div className="room-boxes">
            {unassigned.map(r=>(
              <div key={r.id} className={`room-box occupied no-room ${r.paymentType==='Pago Faltante'?'pago-faltante':''}`} onClick={()=>onClickReservation(r)}>
                <div className="room-box-top"><span className="room-box-num">?</span><span className={`room-box-dot status-${(r.status||'Reserva').toLowerCase().replace('-','')}`}/></div>
                <div className="room-box-name">{r.name}</div>
                <div className="room-box-payment">{r.paymentType}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout:()=>void }) {
  const [reservations,setReservations]=useState<Reservation[]>([]);
  const [weekStart,setWeekStart]=useState<Date>(getMonday(new Date()));
  const [selectedDate,setSelectedDate]=useState<string>(getTodayStr());
  const [showNewModal,setShowNewModal]=useState(false);
  const [detailReservation,setDetailReservation]=useState<Reservation|null>(null);
  const [editReservation,setEditReservation]=useState<Reservation|null>(null);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const showToast=(msg:string,type:'success'|'error'='success')=>{setToast({message:msg,type});setTimeout(()=>setToast(null),3000);};
  const fetchReservations=useCallback(async()=>{setLoading(true);const data=await apiGetReservations(formatDate(weekStart),formatDate(addDays(weekStart,6)));setReservations(data);setLoading(false);},[weekStart]);
  useEffect(()=>{fetchReservations();},[fetchReservations]);
  const days=getWeekDays(weekStart);
  const todayStr=getTodayStr();
  const handleJumpToDate=(dateStr:string)=>{const d=new Date(dateStr+'T12:00:00');setWeekStart(getMonday(d));setSelectedDate(dateStr);};
  const handleAdd=async(data:any)=>{const result=await apiAddReservation(data);if(result.success){showToast('Reservacion guardada');setShowNewModal(false);fetchReservations();}else{showToast(result.error||'Error','error');}};
  const handleUpdate=async(data:any)=>{if(!editReservation?.rowIndex)return;const result=await apiUpdateReservation({...data,rowIndex:editReservation.rowIndex,status:data.status||'Reserva'});if(result.success){showToast('Reservacion actualizada');setEditReservation(null);fetchReservations();}else{showToast(result.error||'Error','error');}};
  const handleDelete=async(r:Reservation)=>{if(!confirm(`Eliminar reservacion de ${r.name}?`))return;if(r.rowIndex){const result=await apiDeleteReservation(r.rowIndex);if(result.success){showToast('Eliminada');setDetailReservation(null);fetchReservations();}else{showToast('Error','error');}}};
  const handleQuickUpdate=async(r:Reservation,field:string,value:string)=>{if(!r.rowIndex)return;const p:any={rowIndex:r.rowIndex,name:r.name,employee:r.employee,phone:r.phone,email:r.email,date:r.date,roomType:r.roomType,numPeople:r.numPeople,roomNumber:r.roomNumber,paymentType:r.paymentType,anticipoPaid:r.anticipoPaid,status:r.status};p[field]=value;const result=await apiUpdateReservation(p);if(result.success){showToast('Actualizado');setDetailReservation(null);fetchReservations();}else{showToast('Error','error');}};
  const weekTotal=reservations.reduce((s,r)=>s+r.price,0);
  return (
    <div className="dashboard">
      <aside className="sidebar-left">
        <div className="sidebar-brand"><span className="sidebar-icon">🏨</span><span className="sidebar-title">Hotel Ancira</span></div>
        <button className="btn-primary btn-full btn-new-sidebar" onClick={()=>setShowNewModal(true)}>+ Nueva Reservacion</button>
        <AvailabilityPanel reservations={reservations} selectedDate={selectedDate}/>
        <div className="sidebar-footer">
          <div className="sidebar-week-total"><span>Ingreso semanal</span><span className="week-total-val">{formatMXN(weekTotal)}</span></div>
          <button className="btn-ghost btn-full" onClick={onLogout}>Cerrar sesion</button>
        </div>
      </aside>
      <main className="main-area">
        <div className="week-nav-bar">
          <div className="week-nav-top">
            <button className="btn-nav" onClick={()=>setWeekStart(prev=>addDays(prev,-7))}>←</button>
            <div className="week-nav-center">
              <input type="date" className="week-date-picker" value={selectedDate} onChange={e=>{if(e.target.value)handleJumpToDate(e.target.value);}}/>
              <span className="week-range">{formatDateDisplay(formatDate(days[0]))} — {formatDateDisplay(formatDate(days[6]))}</span>
            </div>
            <button className="btn-nav" onClick={()=>setWeekStart(prev=>addDays(prev,7))}>→</button>
          </div>
          <div className="day-tabs">
            {days.map(d=>{const ds=formatDate(d);const isToday=ds===todayStr;const isSelected=ds===selectedDate;const ct=reservations.filter(r=>r.date===ds).length;
              return (<button key={ds} className={`day-tab ${isSelected?'active':''} ${isToday?'today':''}`} onClick={()=>setSelectedDate(ds)}>
                <span className="day-tab-name">{DAY_NAMES[d.getDay()].substring(0,3)}</span>
                <span className="day-tab-date">{d.getDate()}</span>
                {ct>0&&<span className="day-tab-badge">{ct}</span>}
              </button>);
            })}
          </div>
        </div>
        <div className="main-scroll">
          {loading?<div className="loading-state"><div className="spinner"/><p>Cargando...</p></div>:
            <RoomGrid reservations={reservations} selectedDate={selectedDate} onClickReservation={setDetailReservation}/>}
        </div>
      </main>
      {showNewModal&&<ReservationFormModal onClose={()=>setShowNewModal(false)} onSave={handleAdd}/>}
      {editReservation&&<ReservationFormModal onClose={()=>setEditReservation(null)} onSave={handleUpdate} initial={editReservation}/>}
      {detailReservation&&!editReservation&&<ReservationDetailModal reservation={detailReservation} onClose={()=>setDetailReservation(null)} onEdit={()=>{setEditReservation(detailReservation);setDetailReservation(null);}} onDelete={()=>handleDelete(detailReservation)} onStatusChange={async s=>handleQuickUpdate(detailReservation,'status',s)} onPaymentChange={async p=>handleQuickUpdate(detailReservation,'paymentType',p)}/>}
      {toast&&<div className={`toast toast-${toast.type}`}>{toast.type==='success'?'✓':'✕'} {toast.message}</div>}
    </div>
  );
}

export default function App() {
  const [authed,setAuthed]=useState(()=>sessionStorage.getItem('hotel_auth')==='true');
  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;
  return <Dashboard onLogout={()=>{sessionStorage.removeItem('hotel_auth');setAuthed(false);}}/>;
}
