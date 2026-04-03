import { useState, useEffect, useCallback } from 'react';
import {
  Reservation, RoomType, PaymentType, ReservationStatus,
  ROOM_TYPES, PAYMENT_TYPES, STATUSES, ROOM_PRICES, TOTAL_ROOMS, PEOPLE_OPTIONS, ROOM_MAP, DAY_NAMES,
} from './types';
import { apiLogin, apiGetReservations, apiAddReservation, apiUpdateReservation, apiDeleteReservation } from './api';

function getMonday(d: Date): Date { const date = new Date(d); const day = date.getDay(); date.setDate(date.getDate() - day + (day === 0 ? -6 : 1)); date.setHours(0,0,0,0); return date; }
function addDays(date: Date, days: number): Date { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
function formatDate(date: Date): string { return date.toISOString().split('T')[0]; }
function formatDateDisplay(ds: string): string { const [y,m,d] = ds.split('-'); return `${d}/${m}/${y}`; }
function formatMXN(n: number): string { return `$${n.toLocaleString('es-MX')} MXN`; }
function getWeekDays(mon: Date): Date[] { return Array.from({length:7},(_,i)=>addDays(mon,i)); }
function getTodayStr(): string { return formatDate(new Date()); }

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    if (await apiLogin(password)) { sessionStorage.setItem('hotel_auth','true'); onLogin(); } else setError('Contrasena incorrecta');
    setLoading(false);
  };
  return (
    <div className="login-container"><div className="login-bg-pattern"/><div className="login-card"><div className="login-header"><div className="login-icon">🏨</div><h1>Hotel Ancira</h1><p>Sistema de Gestion de Reservaciones</p></div>
      <form onSubmit={handleSubmit}><div className="input-group"><label>Contrasena</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresa la contrasena" autoFocus/></div>
        {error && <div className="error-msg">{error}</div>}
        <button type="submit" className="btn-primary btn-full" disabled={loading}>{loading?'Verificando...':'Ingresar'}</button></form></div></div>
  );
}

function Sidebar({ reservations, selectedDate, onNewReservation }: { reservations: Reservation[]; selectedDate: string; onNewReservation: () => void }) {
  const booked: Record<string,number> = {};
  ROOM_TYPES.forEach(rt => booked[rt]=0);
  reservations.filter(r => r.date===selectedDate).forEach(r => { if(booked[r.roomType]!==undefined) booked[r.roomType]++; });
  const totalRes = Object.values(booked).reduce((a,b)=>a+b,0);
  const totalRooms = Object.values(TOTAL_ROOMS).reduce((a,b)=>a+b,0);
  return (
    <div className="sidebar">
      <button className="btn-primary btn-full btn-new-sidebar" onClick={onNewReservation}>+ Nueva Reservacion</button>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Disponibilidad <span className="availability-date">{formatDateDisplay(selectedDate)}</span></div>
        <div className="availability-summary">
          <div className="summary-stat"><span className="stat-number">{totalRes}</span><span className="stat-label">Reservadas</span></div>
          <div className="summary-divider"/>
          <div className="summary-stat"><span className="stat-number available">{totalRooms-totalRes}</span><span className="stat-label">Disponibles</span></div>
          <div className="summary-divider"/>
          <div className="summary-stat"><span className="stat-number">{totalRooms}</span><span className="stat-label">Total</span></div>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Por Tipo</div>
        <div className="room-types-grid">
          {ROOM_TYPES.map(rt => {
            const avail = TOTAL_ROOMS[rt]-booked[rt]; const pct = (booked[rt]/TOTAL_ROOMS[rt])*100;
            return (<div key={rt} className="room-type-card"><div className="room-type-header"><span className="room-name">{rt}</span></div><div className="room-bar-container"><div className="room-bar-fill" style={{width:`${pct}%`}} data-full={avail===0?'true':'false'}/></div><div className="room-type-stats"><span className={`room-available ${avail===0?'full':''}`}>{avail===0?'Lleno':`${avail} disp.`}</span><span className="room-count">{booked[rt]}/{TOTAL_ROOMS[rt]}</span></div><div className="room-price">{formatMXN(ROOM_PRICES[rt])}/noche</div></div>);
          })}
        </div>
      </div>
    </div>
  );
}

function NewReservationModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: { name:string; employee:string; phone:string; email:string; origin:string; startDate:string; endDate:string; roomType:RoomType; numPeople:number; roomNumber:string; paymentType:PaymentType; anticipoPaid:boolean; comments:string }) => void;
}) {
  const [name,setName]=useState(''); const [employee,setEmployee]=useState(''); const [phone,setPhone]=useState(''); const [email,setEmail]=useState(''); const [origin,setOrigin]=useState('');
  const [startDate,setStartDate]=useState(''); const [endDate,setEndDate]=useState('');
  const [roomType,setRoomType]=useState<RoomType>(ROOM_TYPES[0]); const [numPeople,setNumPeople]=useState<number>(PEOPLE_OPTIONS[ROOM_TYPES[0]][0]);
  const [roomNumber,setRoomNumber]=useState(''); const [paymentType,setPaymentType]=useState<PaymentType>(PAYMENT_TYPES[0]);
  const [anticipoPaid,setAnticipoPaid]=useState(false); const [comments,setComments]=useState(''); const [saving,setSaving]=useState(false);
  const handleRoomTypeChange=(rt:RoomType)=>{setRoomType(rt);const o=PEOPLE_OPTIONS[rt];if(!o.includes(numPeople))setNumPeople(o[0]);};
  let numNights=0;
  if(startDate&&endDate&&endDate>=startDate){const s=new Date(startDate+'T12:00:00');const e=new Date(endDate+'T12:00:00');numNights=Math.round((e.getTime()-s.getTime())/(1000*60*60*24))+1;}
  const totalPrice=numNights*ROOM_PRICES[roomType];
  const handleSubmit=async(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||!employee.trim()||!startDate||!endDate)return;if(endDate<startDate){alert('La fecha de salida debe ser igual o posterior a la de entrada');return;}setSaving(true);await onSave({name:name.trim(),employee:employee.trim(),phone:phone.trim(),email:email.trim(),origin:origin.trim(),startDate,endDate,roomType,numPeople,roomNumber:roomNumber.trim(),paymentType,anticipoPaid,comments:comments.trim()});setSaving(false);};
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-large" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h2>Nueva Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre completo" required autoFocus/></div>
          <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e=>setEmployee(e.target.value)} placeholder="Nombre del empleado" required/></div>
          <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Numero de telefono"/></div>
          <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com"/></div>
          <div className="input-group"><label>De donde nos visita?</label><input type="text" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Ciudad, estado o pais"/></div>
          <div className="input-group"><label>Numero de Cuarto</label>
            <select value={roomNumber} onChange={e=>{setRoomNumber(e.target.value);const rm=ROOM_MAP.find(r=>r.num.toString()===e.target.value);if(rm&&rm.type!==roomType)handleRoomTypeChange(rm.type);}}>
              <option value="">Seleccionar cuarto</option>{ROOM_MAP.map(rm=>(<option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>))}
            </select>
          </div>
          <div className="input-group"><label>Fecha de Entrada</label><input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);if(!endDate||endDate<e.target.value)setEndDate(e.target.value);}} min={getTodayStr()} required/></div>
          <div className="input-group"><label>Fecha de Salida</label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate||getTodayStr()} required/></div>
          <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e=>handleRoomTypeChange(e.target.value as RoomType)}>{ROOM_TYPES.map(rt=>(<option key={rt} value={rt}>{rt} - {formatMXN(ROOM_PRICES[rt])}</option>))}</select></div>
          <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e=>setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n=>(<option key={n} value={n}>{n} persona{n!==1?'s':''}</option>))}</select></div>
          <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e=>setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt=>(<option key={pt} value={pt}>{pt}</option>))}</select></div>
          <div className="input-group full-width"><label>Comentarios</label><textarea value={comments} onChange={e=>setComments(e.target.value)} placeholder="Notas adicionales, peticiones especiales..." rows={2}/></div>
        </div>
        <div className="checkbox-group"><label className="checkbox-label"><input type="checkbox" checked={anticipoPaid} onChange={e=>setAnticipoPaid(e.target.checked)}/><span>Dio anticipo del 50% del pago total?</span></label></div>
        <div className="reservation-preview"><span>{numNights} noche{numNights!==1?'s':''} x {formatMXN(ROOM_PRICES[roomType])}</span><span className="preview-price">{formatMXN(totalPrice)}</span></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving||!name.trim()||!employee.trim()||!startDate||!endDate}>{saving?'Guardando...':'Guardar Reservacion'}</button></div>
      </form></div></div>
  );
}

function EditReservationModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (data: { name:string; employee:string; phone:string; email:string; origin:string; date:string; roomType:RoomType; numPeople:number; roomNumber:string; paymentType:PaymentType; anticipoPaid:boolean; status:ReservationStatus; comments:string }) => void;
  initial: Reservation;
}) {
  const [name,setName]=useState(initial.name); const [employee,setEmployee]=useState(initial.employee); const [phone,setPhone]=useState(initial.phone); const [email,setEmail]=useState(initial.email); const [origin,setOrigin]=useState(initial.origin||'');
  const [date,setDate]=useState(initial.date); const [roomType,setRoomType]=useState<RoomType>(initial.roomType); const [numPeople,setNumPeople]=useState<number>(initial.numPeople);
  const [roomNumber,setRoomNumber]=useState(initial.roomNumber); const [paymentType,setPaymentType]=useState<PaymentType>(initial.paymentType);
  const [anticipoPaid,setAnticipoPaid]=useState(initial.anticipoPaid); const [status,setStatus]=useState<ReservationStatus>(initial.status);
  const [comments,setComments]=useState(initial.comments||''); const [saving,setSaving]=useState(false);
  const handleRoomTypeChange=(rt:RoomType)=>{setRoomType(rt);const o=PEOPLE_OPTIONS[rt];if(!o.includes(numPeople))setNumPeople(o[0]);};
  const handleSubmit=async(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||!employee.trim()||!date)return;setSaving(true);await onSave({name:name.trim(),employee:employee.trim(),phone:phone.trim(),email:email.trim(),origin:origin.trim(),date,roomType,numPeople,roomNumber:roomNumber.trim(),paymentType,anticipoPaid,status,comments:comments.trim()});setSaving(false);};
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content modal-large" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h2>Editar Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group"><label>Nombre del Solicitante</label><input type="text" value={name} onChange={e=>setName(e.target.value)} required autoFocus/></div>
          <div className="input-group"><label>Nombre del Empleado</label><input type="text" value={employee} onChange={e=>setEmployee(e.target.value)} required/></div>
          <div className="input-group"><label>Telefono</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
          <div className="input-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <div className="input-group"><label>De donde nos visita?</label><input type="text" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Ciudad, estado o pais"/></div>
          <div className="input-group"><label>Fecha</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></div>
          <div className="input-group"><label>Numero de Cuarto</label><select value={roomNumber} onChange={e=>{setRoomNumber(e.target.value);const rm=ROOM_MAP.find(r=>r.num.toString()===e.target.value);if(rm&&rm.type!==roomType)handleRoomTypeChange(rm.type);}}><option value="">Seleccionar cuarto</option>{ROOM_MAP.map(rm=>(<option key={rm.num} value={rm.num.toString()}>Cuarto {rm.num} ({rm.typeShort})</option>))}</select></div>
          <div className="input-group"><label>Tipo de Habitacion</label><select value={roomType} onChange={e=>handleRoomTypeChange(e.target.value as RoomType)}>{ROOM_TYPES.map(rt=>(<option key={rt} value={rt}>{rt} - {formatMXN(ROOM_PRICES[rt])}</option>))}</select></div>
          <div className="input-group"><label>Numero de Personas</label><select value={numPeople} onChange={e=>setNumPeople(Number(e.target.value))}>{PEOPLE_OPTIONS[roomType].map(n=>(<option key={n} value={n}>{n} persona{n!==1?'s':''}</option>))}</select></div>
          <div className="input-group"><label>Tipo de Pago</label><select value={paymentType} onChange={e=>setPaymentType(e.target.value as PaymentType)}>{PAYMENT_TYPES.map(pt=>(<option key={pt} value={pt}>{pt}</option>))}</select></div>
          <div className="input-group"><label>Estado</label><select value={status} onChange={e=>setStatus(e.target.value as ReservationStatus)}>{STATUSES.map(s=>(<option key={s} value={s}>{s}</option>))}</select></div>
          <div className="input-group full-width"><label>Comentarios</label><textarea value={comments} onChange={e=>setComments(e.target.value)} placeholder="Notas adicionales..." rows={2}/></div>
        </div>
        <div className="checkbox-group"><label className="checkbox-label"><input type="checkbox" checked={anticipoPaid} onChange={e=>setAnticipoPaid(e.target.checked)}/><span>Dio anticipo del 50% del pago total?</span></label></div>
        <div className="reservation-preview"><span>Total:</span><span className="preview-price">{formatMXN(ROOM_PRICES[roomType])}</span></div>
        <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving||!name.trim()||!employee.trim()||!date}>{saving?'Actualizar':'Actualizar'}</button></div>
      </form></div></div>
  );
}

function ReservationDetailModal({ reservation, onClose, onEdit, onDelete, onStatusChange, onPaymentChange }: {
  reservation:Reservation; onClose:()=>void; onEdit:()=>void; onDelete:()=>void; onStatusChange:(s:ReservationStatus)=>void; onPaymentChange:(p:PaymentType)=>void;
}) {
  const [changingStatus,setCS]=useState(false); const [changingPayment,setCP]=useState(false);
  const newStatus:ReservationStatus = reservation.status==='Reserva'?'Check-in':'Reserva';
  const isPF = reservation.paymentType==='Pago Faltante';
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><h2>Detalle de Reservacion</h2><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="detail-status-row">
        <div className={`detail-status-badge status-${reservation.status.toLowerCase().replace('-','')}`}>{reservation.status}</div>
        <button className="btn-status-toggle" onClick={async()=>{setCS(true);await onStatusChange(newStatus);setCS(false);}} disabled={changingStatus}>{changingStatus?'Cambiando...':`Cambiar a ${newStatus}`}</button>
      </div>
      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Nombre</span><span className="detail-value">{reservation.name}</span></div>
        <div className="detail-row"><span className="detail-label">Empleado</span><span className="detail-value">{reservation.employee}</span></div>
        <div className="detail-row"><span className="detail-label">Telefono</span><span className="detail-value">{reservation.phone||'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{reservation.email||'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Origen</span><span className="detail-value">{reservation.origin||'No registrado'}</span></div>
        <div className="detail-row"><span className="detail-label">Fecha</span><span className="detail-value">{formatDateDisplay(reservation.date)}</span></div>
        <div className="detail-row"><span className="detail-label">Habitacion</span><span className="detail-value">{reservation.roomType}</span></div>
        <div className="detail-row"><span className="detail-label">Cuarto #</span><span className="detail-value">{reservation.roomNumber||'No asignado'}</span></div>
        <div className="detail-row"><span className="detail-label">Personas</span><span className="detail-value">{reservation.numPeople}</span></div>
        <div className="detail-row"><span className="detail-label">Anticipo 50%</span><span className="detail-value">{reservation.anticipoPaid?'Si':'No'}</span></div>
        <div className="detail-row"><span className="detail-label">Precio</span><span className="detail-value detail-price">{formatMXN(reservation.price)}</span></div>
        <div className="detail-row full-width"><span className="detail-label">Comentarios</span><span className="detail-value">{reservation.comments||'Sin comentarios'}</span></div>
      </div>
      <div className="detail-payment-row">
        <span className="detail-label">Pago: <strong>{reservation.paymentType}</strong></span>
        {isPF&&<div className="payment-change-buttons">
          <button className="btn-payment-change tarjeta" onClick={async()=>{setCP(true);await onPaymentChange('Tarjeta');setCP(false);}} disabled={changingPayment}>Cambiar a Tarjeta</button>
          <button className="btn-payment-change efectivo" onClick={async()=>{setCP(true);await onPaymentChange('Efectivo');setCP(false);}} disabled={changingPayment}>Cambiar a Efectivo</button>
        </div>}
      </div>
      <div className="modal-actions"><button className="btn-danger" onClick={onDelete}>Eliminar</button><button className="btn-primary" onClick={onEdit}>Editar</button></div>
    </div></div>
  );
}

function WeekView({ reservations, weekStart, onWeekChange, onSelectDate, selectedDate, onClickReservation, onJumpToDate }: {
  reservations:Reservation[]; weekStart:Date; onWeekChange:(d:number)=>void; onSelectDate:(d:string)=>void; selectedDate:string; onClickReservation:(r:Reservation)=>void; onJumpToDate:(d:string)=>void;
}) {
  const days = getWeekDays(weekStart); const todayStr = getTodayStr();
  const byDate: Record<string,Reservation[]> = {};
  days.forEach(d => { byDate[formatDate(d)] = reservations.filter(r => r.date===formatDate(d)); });
  const weekLabel = `${formatDateDisplay(formatDate(days[0]))} — ${formatDateDisplay(formatDate(days[6]))}`;
  return (
    <div className="week-view">
      <div className="week-nav"><button className="btn-nav" onClick={()=>onWeekChange(-1)}>←</button><div className="week-nav-center"><h2 className="week-label">{weekLabel}</h2><input type="date" className="week-date-picker" value={formatDate(weekStart)} onChange={e=>{if(e.target.value)onJumpToDate(e.target.value);}} title="Saltar a semana"/></div><button className="btn-nav" onClick={()=>onWeekChange(1)}>→</button></div>
      <div className="week-grid-rooms">
        <div className="room-labels-col"><div className="room-label-header">Cuarto</div>{ROOM_MAP.map(rm=>(<div key={rm.num} className="room-label-cell"><span className="room-label-num">{rm.num}</span><span className="room-label-type">{rm.typeShort}</span></div>))}</div>
        {days.map(d => {
          const ds=formatDate(d); const dayRes=byDate[ds]||[]; const isToday=ds===todayStr; const isSelected=ds===selectedDate;
          const dayTotal=dayRes.reduce((s,r)=>s+r.price,0);
          const roomResMap:Record<string,Reservation>={}; dayRes.forEach(r=>{if(r.roomNumber)roomResMap[r.roomNumber]=r;});
          return (
            <div key={ds} className={`day-col ${isToday?'today':''} ${isSelected?'selected':''}`} onClick={()=>onSelectDate(ds)}>
              <div className="day-col-header"><span className="day-name">{DAY_NAMES[d.getDay()]}</span><span className="day-date-num">{d.getDate()}</span>{isToday&&<span className="today-badge">Hoy</span>}<div className="day-col-stats"><span>{dayRes.length} res.</span>{dayTotal>0&&<span className="day-col-total">{formatMXN(dayTotal)}</span>}</div></div>
              {ROOM_MAP.map(rm=>{
                const res=roomResMap[rm.num.toString()];
                if(res) return (<div key={rm.num} className={`room-cell occupied payment-${res.paymentType.toLowerCase().replace(' ','-')}`} onClick={e=>{e.stopPropagation();onClickReservation(res);}}><div className="room-cell-top"><span className="room-cell-num">{rm.num}</span><span className={`chip-status-dot status-${res.status.toLowerCase().replace('-','')}`}/></div><span className="room-cell-name">{res.name}</span></div>);
                return <div key={rm.num} className="room-cell empty"><span className="room-cell-num">{rm.num}</span></div>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [reservations,setReservations]=useState<Reservation[]>([]); const [weekStart,setWeekStart]=useState<Date>(getMonday(new Date()));
  const [selectedDate,setSelectedDate]=useState<string>(getTodayStr()); const [showNewModal,setShowNewModal]=useState(false);
  const [detailRes,setDetailRes]=useState<Reservation|null>(null); const [editRes,setEditRes]=useState<Reservation|null>(null);
  const [loading,setLoading]=useState(true); const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const showToast=(m:string,t:'success'|'error'='success')=>{setToast({message:m,type:t});setTimeout(()=>setToast(null),3000);};

  const fetchReservations=useCallback(async()=>{setLoading(true);const data=await apiGetReservations(formatDate(weekStart),formatDate(addDays(weekStart,6)));setReservations(data);setLoading(false);},[weekStart]);
  useEffect(()=>{fetchReservations();},[fetchReservations]);

  const handleAdd=async(data:any)=>{const r=await apiAddReservation(data);if(r.success){showToast(`Reservacion guardada (${r.daysCreated} noche${r.daysCreated!==1?'s':''})`);setShowNewModal(false);fetchReservations();}else showToast(r.error||'Error','error');};
  const handleUpdate=async(data:any)=>{if(!editRes?.rowIndex)return;const r=await apiUpdateReservation({...data,rowIndex:editRes.rowIndex});if(r.success){showToast('Reservacion actualizada');setEditRes(null);fetchReservations();}else showToast(r.error||'Error','error');};
  const handleDelete=async(r:Reservation)=>{if(!confirm(`Eliminar reservacion de ${r.name}?`))return;if(r.rowIndex){const res=await apiDeleteReservation(r.rowIndex);if(res.success){showToast('Eliminada');setDetailRes(null);fetchReservations();}else showToast('Error','error');}};

  const makeQuickUpdate=async(r:Reservation,changes:Partial<{status:string;paymentType:string}>)=>{
    if(!r.rowIndex)return;
    const result=await apiUpdateReservation({rowIndex:r.rowIndex,name:r.name,employee:r.employee,phone:r.phone,email:r.email,origin:r.origin||'',date:r.date,roomType:r.roomType,numPeople:r.numPeople,roomNumber:r.roomNumber,paymentType:changes.paymentType||r.paymentType,anticipoPaid:r.anticipoPaid,status:changes.status||r.status,comments:r.comments||''});
    if(result.success){showToast('Actualizado');setDetailRes(null);fetchReservations();}else showToast('Error','error');
  };

  const weekTotal=reservations.reduce((s,r)=>s+r.price,0);
  return (
    <div className="dashboard">
      <header className="dashboard-header"><div className="header-left"><h1 className="app-title"><span className="title-icon">🏨</span> Hotel Ancira</h1></div><div className="header-center"><div className="week-summary"><div className="summary-item"><span className="summary-value">{reservations.length}</span><span className="summary-label">Reservaciones</span></div><div className="summary-sep"/><div className="summary-item"><span className="summary-value revenue">{formatMXN(weekTotal)}</span><span className="summary-label">Ingreso Semanal</span></div></div></div><div className="header-right"><button className="btn-ghost" onClick={onLogout}>Salir</button></div></header>
      <main className="dashboard-body">
        <Sidebar reservations={reservations} selectedDate={selectedDate} onNewReservation={()=>setShowNewModal(true)}/>
        <div className="main-content">
          {loading?<div className="loading-state"><div className="spinner"/><p>Cargando reservaciones...</p></div>:
            <WeekView reservations={reservations} weekStart={weekStart} onWeekChange={dir=>setWeekStart(prev=>addDays(prev,dir*7))} onSelectDate={setSelectedDate} selectedDate={selectedDate} onClickReservation={setDetailRes} onJumpToDate={ds=>{setWeekStart(getMonday(new Date(ds+'T12:00:00')));}}/>}
        </div>
      </main>
      {showNewModal&&<NewReservationModal onClose={()=>setShowNewModal(false)} onSave={handleAdd}/>}
      {editRes&&<EditReservationModal onClose={()=>setEditRes(null)} onSave={handleUpdate} initial={editRes}/>}
      {detailRes&&!editRes&&(
        <ReservationDetailModal reservation={detailRes} onClose={()=>setDetailRes(null)}
          onEdit={()=>{setEditRes(detailRes);setDetailRes(null);}}
          onDelete={()=>handleDelete(detailRes)}
          onStatusChange={async ns=>{await makeQuickUpdate(detailRes,{status:ns});}}
          onPaymentChange={async np=>{await makeQuickUpdate(detailRes,{paymentType:np});}}/>
      )}
      {toast&&<div className={`toast toast-${toast.type}`}>{toast.type==='success'?'✓':'✕'} {toast.message}</div>}
    </div>
  );
}

export default function App() {
  const [authed,setAuthed]=useState(()=>sessionStorage.getItem('hotel_auth')==='true');
  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;
  return <Dashboard onLogout={()=>{sessionStorage.removeItem('hotel_auth');setAuthed(false);}}/>;
}
