import { useEffect, useState } from 'react';
import { Calendar, Clock, DollarSign, History, Package, Scissors, ShieldCheck, Users, LogOut, ArrowLeft, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { apiRequest, filterActiveBarbers, filterActiveServices } from '../services/api';

const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
const localDate = (date = new Date()) => date.toLocaleDateString('en-CA');

export default function AdminDashboardNew({ onBackToPublic }) {
  const [token, setToken] = useState(localStorage.getItem('barber_token') || '');
  const [tab, setTab] = useState('caja');
  const [now, setNow] = useState(new Date());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [movements, setMovements] = useState([]);
  const [allMovements, setAllMovements] = useState([]);
  const [pins, setPins] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pending, setPending] = useState({ days: [], advances: [], advancesDeducted: 0 });
  const [selectedDates, setSelectedDates] = useState([]);
  const [settlementBarberId, setSettlementBarberId] = useState('');
  const [cashDate, setCashDate] = useState(localDate());
  const [agendaDate, setAgendaDate] = useState(localDate());
  const [historyPeriod, setHistoryPeriod] = useState('TODAY');
  const [saleBarberId, setSaleBarberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cart, setCart] = useState([]);
  const [cashModal, setCashModal] = useState(false);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [movementForm, setMovementForm] = useState({ type: 'EXPENSE', category: 'Insumos', barberId: '', description: '', amount: '', paymentMethod: 'CASH' });
  const [advanceForm, setAdvanceForm] = useState({ barberId: '', description: '', amount: '', paymentMethod: 'CASH' });
  const [balancePeriod, setBalancePeriod] = useState('TODAY');
  const [barberModal, setBarberModal] = useState(false);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [barberForm, setBarberForm] = useState({ name: '', username: '', password: '', role: 'BARBER', commissionRate: '50' });

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

  const loadAll = async () => {
    const endpoints = [['barbers','/barbers'],['services','/services'],['products','/products'],['sales','/sales'],['appointments','/appointments'],['pins','/security-pins'],['analytics','/analytics'],['allMovements','/cash-movements']];
    await Promise.allSettled(endpoints.map(async ([key, endpoint]) => {
      const value = await apiRequest(endpoint);
      if (key === 'barbers') {
        const activeBarbers = filterActiveBarbers(value);
        setBarbers(activeBarbers);
        if (!activeBarbers.some((b) => String(b.id) === String(saleBarberId))) {
          setSaleBarberId(activeBarbers[0] ? String(activeBarbers[0].id) : '');
        }
        if (!activeBarbers.some((b) => String(b.id) === String(settlementBarberId))) {
          setSettlementBarberId(activeBarbers[0] ? String(activeBarbers[0].id) : '');
        }
      }
      if (key === 'services') setServices(filterActiveServices(value));
      if (key === 'products') setProducts(value);
      if (key === 'sales') setSales(value);
      if (key === 'appointments') setAppointments(value);
      if (key === 'pins') setPins(value);
      if (key === 'analytics') setAnalytics(value);
      if (key === 'allMovements') setAllMovements(value);
    }));
  };

  useEffect(() => { if (token) loadAll(); }, [token]);
  useEffect(() => { if (!token) return; apiRequest(`/cash-movements?date=${cashDate}`).then(setMovements).catch(() => setMovements([])); }, [cashDate, token]);
  useEffect(() => { if (!token) return; apiRequest('/cash-movements').then(setAllMovements).catch(() => setAllMovements([])); }, [token]);
  useEffect(() => { if (!token || !settlementBarberId) return; apiRequest(`/settlements/pending/${settlementBarberId}`).then((value) => { setPending(value); setSelectedDates([]); setSelectedAdvanceIds([]); }).catch(() => setPending({ days: [], advances: [], advancesDeducted: 0 })); }, [settlementBarberId, token]);

  const login = async (event) => {
    event.preventDefault(); setLoginError('');
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('barber_token', data.token); localStorage.setItem('barber_user', JSON.stringify(data.user)); setToken(data.token);
      setUsername(''); setPassword('');
    } catch (error) { setLoginError(error.message); }
  };

  const logout = () => { localStorage.removeItem('barber_token'); localStorage.removeItem('barber_user'); setToken(''); setUsername(''); setPassword(''); };

  if (!token) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center p-4">
      <form onSubmit={login} autoComplete="off" className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-7 space-y-4">
        <div className="flex items-center gap-3"><img src="/logo.png" className="h-12 w-12 object-contain rounded-xl border border-amber-500/40 p-1" onError={(e) => e.currentTarget.style.display='none'} /><div><b className="text-amber-400">ELYSIUM</b><p className="text-xs text-zinc-500">PANEL DEL LOCAL</p></div></div>
        <input name="barber_username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3" placeholder="Usuario" />
        <input type="password" name="barber_password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3" placeholder="Contraseña" />
        {loginError && <p className="text-red-400 text-sm">{loginError}</p>}<button className="w-full bg-amber-500 text-zinc-950 font-extrabold py-3 rounded-xl">Ingresar</button>
        {onBackToPublic && <button type="button" onClick={onBackToPublic} className="w-full text-zinc-400 text-sm">Ver página de clientes</button>}
      </form>
    </div>
  );

  const start = new Date(`${cashDate}T00:00:00`); const end = new Date(`${cashDate}T23:59:59.999`);
  const daySales = sales.filter((sale) => { const date = new Date(sale.createdAt); return date >= start && date <= end; });
  const dayMovements = movements.filter((movement) => { const date = new Date(movement.createdAt); return date >= start && date <= end; });
  let serviceRevenue = 0, productRevenue = 0, beverageRevenue = 0, serviceCount = 0, productCount = 0, beverageCount = 0;
  daySales.forEach((sale) => (sale.items || []).forEach((item) => {
    const amount = Number(item.subtotal || 0); const quantity = Number(item.quantity || 1);
    if (item.itemType === 'SERVICE') { serviceRevenue += amount; serviceCount += quantity; }
    else if (item.itemType === 'BEVERAGE' || item.product?.itemGroup === 'BEVERAGE') { beverageRevenue += amount; beverageCount += quantity; }
    else { productRevenue += amount; productCount += quantity; }
  }));
  const salesRevenue = daySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totals = { CASH: 0, TRANSFER: 0, QR: 0, SOCIOS: 0 };
  daySales.forEach((sale) => (sale.payments || []).forEach((payment) => { const method = String(payment.method).toUpperCase(); if (method in totals) totals[method] += Number(payment.amount || 0); }));
  dayMovements.forEach((movement) => { const method = String(movement.paymentMethod).toUpperCase(); if (method in totals) totals[method] += movement.type === 'INCOME' ? Number(movement.amount) : -Number(movement.amount); });

  const addCart = (item, itemType) => setCart((current) => [...current, { itemType, id: item.id, name: item.name, price: Number(item.price), quantity: 1 }]);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const checkout = async () => {
    if (!saleBarberId || !cart.length) return alert('Elegí barbero e ítems.');
    try {
      const items = cart.map((item) => item.itemType === 'SERVICE' ? { itemType:'SERVICE', serviceId:item.id, quantity:item.quantity } : { itemType:item.itemType, productId:item.id, quantity:item.quantity });
      await apiRequest('/sales', { method:'POST', body:JSON.stringify({ barberId:Number(saleBarberId), items, payments:[{ method:paymentMethod, amount:cartTotal }] }) }); setCart([]); await loadAll();
    } catch (error) { alert(error.message); }
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    if (!Number(movementForm.amount)) return;
    try { await apiRequest('/cash-movements', { method:'POST', body:JSON.stringify({ ...movementForm, amount:Number(movementForm.amount), barberId:movementForm.category === 'Adelanto' ? Number(movementForm.barberId) : null }) }); setCashModal(false); await loadAll(); } catch (error) { alert(error.message); }
  };

  const openAdvance = (barberId = '') => {
    setAdvanceForm({ barberId: barberId ? String(barberId) : settlementBarberId, description: '', amount: '', paymentMethod: 'CASH' });
    setAdvanceModal(true);
  };

  const submitAdvance = async (event) => {
    event.preventDefault();
    if (!advanceForm.barberId || !advanceForm.description.trim() || !Number(advanceForm.amount)) return alert('Completá barbero, motivo y monto.');
    try {
      await apiRequest('/cash-movements', { method: 'POST', body: JSON.stringify({
        type: 'EXPENSE',
        category: 'Adelanto',
        description: advanceForm.description.trim(),
        amount: Number(advanceForm.amount),
        paymentMethod: advanceForm.paymentMethod,
        barberId: Number(advanceForm.barberId),
      }) });
      const selectedBarberId = Number(advanceForm.barberId);
      setAdvanceModal(false);
      setSettlementBarberId(String(selectedBarberId));
      setPending(await apiRequest(`/settlements/pending/${selectedBarberId}`));
      await loadAll();
      const barberName = barbers.find((barber) => barber.id === selectedBarberId)?.displayName || 'Barbero';
      alert(`Adelanto registrado y aplicado a ${barberName}.`);
    } catch (error) { alert(error.message); }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm('¿Anular esta venta y devolver el stock?')) return;
    try { await apiRequest(`/sales/${sale.id}`, { method:'DELETE' }); await loadAll(); } catch (error) { alert(error.message); }
  };
  const deleteMovement = async (movement) => { if (!window.confirm('¿Eliminar movimiento?')) return; try { await apiRequest(`/cash-movements/${movement.id}`, { method:'DELETE' }); await loadAll(); } catch (error) { alert(error.message); } };
  const deleteAdvance = async (advance) => {
    if (!window.confirm('¿Anular este adelanto?')) return;
    try {
      await apiRequest(`/cash-movements/${advance.id}`, { method: 'DELETE' }); await loadAll();
      if (settlementBarberId) setPending(await apiRequest(`/settlements/pending/${settlementBarberId}`));
    } catch (error) { alert(error.message); }
  };

  const editBarberCommission = async (barber) => { const value = prompt('Porcentaje de comisión sobre cortes', barber.commissionRate ?? 100); if (value === null) return; try { await apiRequest(`/barbers/${barber.id}`, { method:'PATCH', body:JSON.stringify({ commissionRate:Number(value) }) }); await loadAll(); } catch (error) { alert(error.message); } };
  const createBarber = async (event) => {
    event.preventDefault();
    try {
      await apiRequest('/barbers', { method: 'POST', body: JSON.stringify({
        name: barberForm.name.trim(),
        username: barberForm.username.trim(),
        password: barberForm.password,
        role: barberForm.role,
        commissionRate: Number(barberForm.commissionRate),
      }) });
      setBarberModal(false);
      setBarberForm({ name: '', username: '', password: '', role: 'BARBER', commissionRate: '50' });
      await loadAll();
    } catch (error) { alert(error.message); }
  };
  const deactivateBarber = async (barber) => {
    if (!window.confirm(`¿Dar de baja a ${barber.displayName}? No se borrarán ventas ni turnos históricos.`)) return;
    try { await apiRequest(`/barbers/${barber.id}`, { method: 'DELETE' }); await loadAll(); } catch (error) { alert(error.message); }
  };
  const liquidate = async () => { if (!selectedDates.length) return alert('Seleccioná al menos un día'); try { await apiRequest('/settlements', { method:'POST', body:JSON.stringify({ barberId:Number(settlementBarberId), selectedDates, selectedAdvanceIds }) }); await loadAll(); setSelectedDates([]); setSelectedAdvanceIds([]); if (settlementBarberId) setPending(await apiRequest(`/settlements/pending/${settlementBarberId}`)); } catch (error) { alert(error.message); } };

  const editProduct = async (product) => { const name = prompt('Nombre', product.name); if (name===null) return; const price = prompt('Precio', product.price); if (price===null) return; try { await apiRequest(`/products/${product.id}`, { method:'PATCH', body:JSON.stringify({ name, price:Number(price) }) }); await loadAll(); } catch (error) { alert(error.message); } };
  const addProduct = async (itemGroup) => { const name = prompt(itemGroup === 'BEVERAGE' ? 'Nombre de la bebida' : 'Nombre del producto'); if (!name) return; const price = prompt('Precio'); if (!price) return; try { await apiRequest('/products', { method:'POST', body:JSON.stringify({ name, categoryName:itemGroup === 'BEVERAGE' ? 'Bebidas' : 'Productos', price:Number(price), costPrice:0, stock:0, minStock:5, itemGroup, commissionRate:0 }) }); await loadAll(); } catch (error) { alert(error.message); } };
  const adjustStock = async (product, quantity) => { try { await apiRequest(`/products/${product.id}/stock`, { method:'PATCH', body:JSON.stringify({ type:quantity>=0?'IN':'OUT', quantity:Math.abs(quantity), reason:'Ajuste desde panel' }) }); await loadAll(); } catch (error) { alert(error.message); } };
  const deleteProduct = async (product) => { if (!window.confirm(`¿Eliminar ${product.name}?`)) return; try { await apiRequest(`/products/${product.id}`, { method:'DELETE' }); await loadAll(); } catch (error) { alert(error.message); } };

  const editService = async (service) => { const name=prompt('Nombre',service.name); if(name===null)return; const price=prompt('Precio',service.price); if(price===null)return; const duration=prompt('Duración (minutos)',service.durationMinutes); if(duration===null)return; try { await apiRequest(`/services/${service.id}`,{method:'PATCH',body:JSON.stringify({name,price:Number(price),durationMinutes:Number(duration)})}); await loadAll(); } catch(error){alert(error.message)} };
  const deleteService = async (service) => { if(!window.confirm(`¿Eliminar o desactivar ${service.name}?`))return; try{await apiRequest(`/services/${service.id}`,{method:'DELETE'});await loadAll()}catch(error){alert(error.message)} };
  const createService = async (event) => { event.preventDefault(); const form=new FormData(event.currentTarget); try{await apiRequest('/services',{method:'POST',body:JSON.stringify({name:form.get('name'),description:form.get('description'),price:Number(form.get('price')),durationMinutes:Number(form.get('durationMinutes'))})});event.currentTarget.reset();await loadAll()}catch(error){alert(error.message)} };
  const updatePin = async (action) => { const value=prompt(action.pin?'Nuevo PIN de 4 dígitos':'PIN de 4 dígitos',action.pin||''); if(value===null)return; if(value&&!/\d{4}/.test(value))return alert('El PIN debe tener 4 dígitos'); try{await apiRequest(`/security-pins/${action.actionKey}`,{method:'PATCH',body:JSON.stringify({pin:value||null})});await loadAll()}catch(error){alert(error.message)} };

  const nav = [
    ['caja','Caja Diaria','Ingresos, egresos y POS',DollarSign], ['balance','Balance por Peluquero','Ganancias y liquidación',Users], ['historial','Historial Ventas','Detalle y anulaciones',History], ['agenda','Agenda','Turnos por barbero',Calendar], ['equipo','Liquidaciones','Comisiones y adelantos',Users], ['stock','Stock','Productos y bebidas',Package], ['analytics','Analytics','Métricas del local',Clock], ['servicios','Servicios','Cortes y precios',Scissors], ['seguridad','Seguridad','PINs protegidos',ShieldCheck]
  ];
  const filteredHistory = sales.filter((sale) => historyPeriod === 'ALL' || new Date(sale.createdAt).toLocaleDateString('es-AR') === now.toLocaleDateString('es-AR'));
  const agendaItems = appointments.filter((appointment) => String(appointment.appointmentDate?.slice(0,10)) === agendaDate);
  const slots=[]; for(let m=600;m<=1290;m+=30)slots.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);

  const ownerBarber = barbers.find((barber) => String(barber.displayName).toLowerCase().includes('marcos')) || barbers[0] || null;
  const employeeBarber = barbers.find((barber) => String(barber.displayName).toLowerCase().includes('gonzalo')) || barbers[1] || null;

  const inBalancePeriod = (dateValue) => {
    const date = new Date(dateValue);
    const today = new Date();
    if (balancePeriod === 'TODAY') return date.toLocaleDateString('es-AR') === today.toLocaleDateString('es-AR');
    if (balancePeriod === 'WEEK') {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return date >= from && date <= today;
    }
    if (balancePeriod === 'MONTH') return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    return true;
  };

  const balanceSales = sales.filter((sale) => inBalancePeriod(sale.createdAt));
  let marcosCuts = 0, marcosCutRevenue = 0, gonzaloCuts = 0, gonzaloCutRevenue = 0, productRevenuePeriod = 0, productCountPeriod = 0, beverageRevenuePeriod = 0, beverageCountPeriod = 0;
  balanceSales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const amount = Number(item.subtotal || 0);
      const quantity = Number(item.quantity || 1);
      if (item.itemType === 'SERVICE') {
        if (ownerBarber && sale.barberId === ownerBarber.id) { marcosCuts += quantity; marcosCutRevenue += amount; }
        if (employeeBarber && sale.barberId === employeeBarber.id) { gonzaloCuts += quantity; gonzaloCutRevenue += amount; }
      } else if (item.itemType === 'BEVERAGE' || item.product?.itemGroup === 'BEVERAGE') {
        beverageRevenuePeriod += amount; beverageCountPeriod += quantity;
      } else {
        productRevenuePeriod += amount; productCountPeriod += quantity;
      }
    });
  });
  const employeeRate = Number(employeeBarber?.commissionRate ?? 50);
  const ownerGonzaloShare = gonzaloCutRevenue * (100 - employeeRate) / 100;
  const gonzaloCommission = gonzaloCutRevenue * employeeRate / 100;
  const periodAdvances = allMovements.filter((movement) => {
    if (movement.type !== 'EXPENSE' || movement.category !== 'Adelanto' || movement.settled) return false;
    if (employeeBarber && Number(movement.barberId) !== Number(employeeBarber.id)) return false;
    return inBalancePeriod(movement.createdAt);
  });
  const gonzaloAdvances = periodAdvances.reduce((sum, movement) => sum + Number(movement.amount || 0), 0);
  const gonzaloNet = gonzaloCommission - gonzaloAdvances;
  const marcosTotal = marcosCutRevenue + ownerGonzaloShare + productRevenuePeriod + beverageRevenuePeriod;

  return <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row">
    <aside className="lg:w-72 shrink-0 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4">
      <div className="flex items-center gap-3 mb-5"><img src="/logo.png" alt="Elysium" className="h-12 w-12 object-contain rounded-xl border border-amber-500/40 p-1" onError={(e)=>e.currentTarget.style.display='none'} /><div><b className="text-amber-400">ELYSIUM</b><p className="text-xs text-zinc-500">BARBER SHOP</p></div></div>
      <nav className="grid grid-cols-2 lg:grid-cols-1 gap-2">{nav.map(([id,label,subtitle,Icon]) => <button key={id} onClick={()=>setTab(id)} className={`text-left px-3 py-3 rounded-xl border ${tab===id?'bg-amber-500 text-zinc-950 border-amber-500':'bg-zinc-950 text-zinc-300 border-zinc-800'}`}><span className="flex items-center gap-2"><Icon className="w-4 h-4"/><b className="text-sm">{label}</b></span><span className={`block text-[10px] mt-1 ${tab===id?'text-zinc-700':'text-zinc-500'}`}>{subtitle}</span></button>)}</nav>
      {onBackToPublic && <button onClick={onBackToPublic} className="mt-4 w-full border border-zinc-700 text-amber-400 py-3 rounded-xl text-sm font-bold">Ver Página de Clientes</button>}<button onClick={logout} className="mt-2 w-full border border-zinc-700 text-zinc-400 py-2.5 rounded-xl text-sm">Cerrar Sesión</button>
    </aside>

    <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0">
      {tab==='caja' && <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-extrabold">Caja Diaria</h1><p className="text-xs text-zinc-500">Arqueo, ventas y movimientos</p></div><div className="flex gap-2"><button onClick={()=>setCashDate(localDate(new Date(new Date(`${cashDate}T12:00:00`).setDate(new Date(`${cashDate}T12:00:00`).getDate()-1))))} className="px-3 py-2 border border-zinc-700 rounded-xl">←</button><button onClick={()=>setCashDate(localDate())} className="px-3 py-2 border border-zinc-700 rounded-xl text-sm">Hoy · {new Date(`${cashDate}T12:00:00`).toLocaleDateString('es-AR')}</button><button onClick={()=>setCashDate(localDate(new Date(new Date(`${cashDate}T12:00:00`).setDate(new Date(`${cashDate}T12:00:00`).getDate()+1))))} className="px-3 py-2 border border-zinc-700 rounded-xl">→</button></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={()=>{setMovementForm({...movementForm,type:'INCOME',category:'Ingreso extra'});setCashModal(true)}} className="bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-sm">+ Registrar ingreso</button><button onClick={()=>{setMovementForm({...movementForm,type:'EXPENSE',category:'Insumos'});setCashModal(true)}} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl font-bold text-sm">+ Registrar egreso</button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['CASH','Efectivo'],['TRANSFER','Transferencia'],['QR','QR'],['SOCIOS','Socios']].map(([key,label])=><div key={key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><p className="text-xs text-zinc-400">{label}</p><b className="text-xl">{formatMoney(totals[key])}</b></div>)}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><p className="text-xs text-zinc-400">Total facturado</p><b className="text-xl text-amber-400">{formatMoney(salesRevenue)}</b></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><p className="text-xs text-zinc-400">Cortes · {serviceCount}</p><b className="text-xl">{formatMoney(serviceRevenue)}</b></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><p className="text-xs text-zinc-400">Productos · {productCount}</p><b className="text-xl">{formatMoney(productRevenue)}</b></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><p className="text-xs text-zinc-400">Bebidas · {beverageCount}</p><b className="text-xl">{formatMoney(beverageRevenue)}</b></div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><div className="flex justify-between mb-3"><h3 className="font-bold">¿Quién realizó el corte o venta?</h3><span className="text-amber-400 font-mono">{now.toLocaleTimeString('es-AR')}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{barbers.map((barber)=><button key={barber.id} onClick={()=>setSaleBarberId(String(barber.id))} className={`p-4 rounded-2xl border text-left ${String(saleBarberId)===String(barber.id)?'bg-amber-500 text-zinc-950 border-amber-500':'bg-zinc-950 border-zinc-800'}`}><b className="block text-lg">{barber.displayName}</b><span className="text-xs">Comisión sobre cortes: {barber.commissionRate ?? 100}%</span></button>)}</div></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="font-bold mb-3">1. Elegir Corte</h3>{services.map((service)=><button key={service.id} onClick={()=>addCart({id:service.id,name:service.name,price:service.price},'SERVICE')} className="w-full flex justify-between bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-xl mb-2 text-sm"><span>{service.name}</span><b>{formatMoney(service.price)}</b></button>)}</div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="font-bold mb-3">2. Sumar Bebida</h3>{products.filter((p)=>p.itemGroup==='BEVERAGE').map((product)=><button key={product.id} onClick={()=>addCart(product,'BEVERAGE')} className="w-full flex justify-between bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-xl mb-2 text-sm"><span>{product.name}</span><b>{formatMoney(product.price)}</b></button>)}</div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="font-bold mb-3">3. Sumar Producto</h3>{products.filter((p)=>p.itemGroup==='PRODUCT').map((product)=><button key={product.id} onClick={()=>addCart(product,'PRODUCT')} className="w-full flex justify-between bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-xl mb-2 text-sm"><span>{product.name}</span><b>{formatMoney(product.price)}</b></button>)}</div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"><h3 className="font-bold">Ticket</h3><select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="QR">QR</option><option value="SOCIOS">Socios</option></select><div className="max-h-52 overflow-auto">{cart.map((item,index)=><div key={index} className="flex justify-between py-2 border-b border-zinc-800"><span>{item.quantity}× {item.name}</span><button onClick={()=>setCart((current)=>current.filter((_,i)=>i!==index))} className="text-red-400">Eliminar</button></div>)}</div><div className="flex justify-between"><b>Total</b><b className="text-xl text-amber-400">{formatMoney(cartTotal)}</b></div><button onClick={checkout} disabled={!cart.length} className="w-full bg-amber-500 disabled:opacity-40 text-zinc-950 font-extrabold py-3 rounded-xl">Cobrar</button></div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><h3 className="font-bold mb-3">Movimientos del día</h3>{dayMovements.map((movement)=><div key={movement.id} className="flex justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-2"><div><b>{movement.category}</b><span className="text-zinc-400 ml-2">{movement.description}</span></div><div className="flex gap-3"><b>{formatMoney(movement.amount)}</b><button onClick={()=>deleteMovement(movement)} className="text-red-400">Eliminar</button></div></div>)}</div>
      </div>}

      {tab==='balance' && <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Balance por Peluquero</h1><p className="text-xs text-zinc-400">Ganancias reales, comisiones y liquidación</p></div><div className="flex flex-wrap gap-2">{[['TODAY','Hoy'],['WEEK','Últimos 7 días'],['MONTH','Este mes'],['ALL','Todo']].map(([key,label])=><button key={key} onClick={()=>setBalancePeriod(key)} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${balancePeriod===key?'bg-amber-500 text-zinc-950':'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>{label}</button>)}</div></div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-gradient-to-br from-amber-500/15 to-zinc-900 border border-amber-500/40 rounded-2xl p-6 space-y-5"><p className="text-xs uppercase tracking-widest text-amber-400 font-bold">Marcos Mayo · Dueño</p><p className="text-4xl font-extrabold text-amber-400">{formatMoney(marcosTotal)}</p><p className="text-xs text-zinc-400">Total general que se lleva Marcos</p><div className="grid grid-cols-2 gap-3"><div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Cortes de Marcos</p><b className="block text-xl">{marcosCuts} cortes</b><span className="text-amber-400 text-sm font-bold">{formatMoney(marcosCutRevenue)}</span></div><div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Parte por Gonzalo</p><b className="block text-xl">{100-employeeRate}%</b><span className="text-amber-400 text-sm font-bold">{formatMoney(ownerGonzaloShare)}</span></div><div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Productos vendidos</p><b className="block text-xl">{productCountPeriod} unidades</b><span className="text-sky-400 text-sm font-bold">{formatMoney(productRevenuePeriod)}</span></div><div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Bebidas vendidas</p><b className="block text-xl">{beverageCountPeriod} unidades</b><span className="text-emerald-400 text-sm font-bold">{formatMoney(beverageRevenuePeriod)}</span></div></div></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5"><p className="text-xs uppercase tracking-widest text-sky-400 font-bold">Gonzalo Batalla · Empleado</p><p className="text-4xl font-extrabold text-emerald-400">{formatMoney(gonzaloNet)}</p><p className="text-xs text-zinc-400">Neto final a pagarle</p><div className="grid grid-cols-2 gap-3"><div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Cortes realizados</p><b className="text-3xl">{gonzaloCuts}</b></div><div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Facturado bruto</p><b className="text-xl">{formatMoney(gonzaloCutRevenue)}</b></div><div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-400">Comisión ({employeeRate}%)</p><b className="text-xl text-sky-400">{formatMoney(gonzaloCommission)}</b></div><div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"><p className="text-xs text-red-400">Adelantos descontados</p><b className="text-xl text-red-400">− {formatMoney(gonzaloAdvances)}</b></div></div></div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><h2 className="font-extrabold mb-4">Comparativa de Cortes por Peluquero</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-zinc-500 border-b border-zinc-800"><th className="py-2">Peluquero</th><th>Cantidad</th><th>Facturación</th><th>Ticket promedio</th><th>Porcentaje</th></tr></thead><tbody>{[ownerBarber,employeeBarber].filter(Boolean).map((barber)=>{const isOwner=barber.id===ownerBarber?.id;const count=isOwner?marcosCuts:gonzaloCuts;const revenue=isOwner?marcosCutRevenue:gonzaloCutRevenue;return <tr key={barber.id} className="border-b border-zinc-800/50"><td className="py-3 font-bold">{barber.displayName}</td><td>{count} cortes</td><td className="text-amber-400 font-bold">{formatMoney(revenue)}</td><td>{count?formatMoney(revenue/count):formatMoney(0)}</td><td>{barber.commissionRate??100}%</td></tr>})}</tbody></table></div></div>
      </div>}

      {tab==='historial' && <div className="space-y-5"><div className="flex justify-between"><h1 className="text-2xl font-extrabold">Historial de Ventas</h1><div className="flex gap-2"><button onClick={()=>setHistoryPeriod('TODAY')} className={`px-4 py-2 rounded-xl ${historyPeriod==='TODAY'?'bg-amber-500 text-zinc-950':'bg-zinc-900 border border-zinc-800'}`}>Hoy</button><button onClick={()=>setHistoryPeriod('ALL')} className={`px-4 py-2 rounded-xl ${historyPeriod==='ALL'?'bg-amber-500 text-zinc-950':'bg-zinc-900 border border-zinc-800'}`}>Histórico</button></div></div>{['Bebidas','Productos','Cortes'].map((title)=>{const group=title==='Cortes'?'SERVICE':title==='Bebidas'?'BEVERAGE':'PRODUCT';const rows=filteredHistory.flatMap((sale)=>(sale.items||[]).filter((item)=>item.itemType==='SERVICE'?group==='SERVICE':item.itemType==='BEVERAGE'||item.product?.itemGroup==='BEVERAGE'?group==='BEVERAGE':group==='PRODUCT').map((item)=>({sale,item})));return <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><h2 className="font-bold mb-3">Historial de {title}</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-zinc-500 text-left"><th>Fecha</th><th>Detalle</th><th>Barbero</th><th>Pago</th><th>Monto</th><th></th></tr></thead><tbody>{rows.map(({sale,item})=><tr key={`${sale.id}-${item.id}`} className="border-t border-zinc-800"><td className="py-3 text-xs">{new Date(sale.createdAt).toLocaleString('es-AR')}</td><td>{item.description} × {item.quantity}</td><td>{sale.barber?.displayName}</td><td>{sale.payments?.[0]?.method}</td><td className="font-bold text-amber-400">{formatMoney(item.subtotal)}</td><td><button onClick={()=>deleteSale(sale)} className="text-red-400">Anular</button></td></tr>)}</tbody></table></div></div>})}</div>}

      {tab==='agenda' && <div className="space-y-5"><div className="flex justify-between"><h1 className="text-2xl font-extrabold">Agenda Visual</h1><div className="flex gap-2"><button onClick={()=>setAgendaDate(localDate(new Date(new Date(`${agendaDate}T12:00:00`).setDate(new Date(`${agendaDate}T12:00:00`).getDate()-1))))} className="px-3 py-2 border border-zinc-700 rounded-xl">←</button><button onClick={()=>setAgendaDate(localDate())} className="px-3 py-2 border border-zinc-700 rounded-xl">Hoy</button><button onClick={()=>setAgendaDate(localDate(new Date(new Date(`${agendaDate}T12:00:00`).setDate(new Date(`${agendaDate}T12:00:00`).getDate()+1))))} className="px-3 py-2 border border-zinc-700 rounded-xl">→</button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-5">{barbers.map((barber)=>{const items=agendaItems.filter((a)=>String(a.barberId)===String(barber.id));return <div key={barber.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"><div className="p-4 flex justify-between"><b>{barber.displayName}</b><span className="text-amber-400">{items.length} turnos</span></div><div className="max-h-[720px] overflow-auto">{slots.map((slot)=>{const turn=items.find((a)=>a.startTime===slot);return <div key={slot} className="grid grid-cols-[62px_1fr] min-h-16 border-t border-zinc-800"><span className="text-xs text-zinc-500 p-3 border-r border-zinc-800">{slot}</span><div className="p-2">{turn&&<div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2"><b>{turn.customer?.firstName} {turn.customer?.lastName}</b><p className="text-xs text-zinc-400">{turn.service?.name}</p><button onClick={()=>{setSaleBarberId(String(barber.id));setTab('caja');addCart({id:turn.serviceId,name:turn.service?.name,price:turn.priceSnapshot},'SERVICE')}} className="text-emerald-400 text-xs mr-3 mt-2">Cobrar</button><button onClick={async()=>{await apiRequest(`/appointments/cancel/${turn.cancellationCode}`,{method:'PATCH'});await loadAll()}} className="text-red-400 text-xs mt-2">Cancelar</button></div>}</div></div>})}</div></div>})}</div></div>}

      {tab==='equipo' && <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Liquidaciones y Adelantos</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>setBarberModal(true)} className="bg-amber-500 text-zinc-950 px-4 py-2 rounded-xl text-sm font-bold">+ Nuevo Peluquero</button>
            <button onClick={()=>openAdvance(settlementBarberId)} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-sm font-bold">+ Registrar Adelanto</button>
            <select value={settlementBarberId} onChange={(e)=>setSettlementBarberId(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 cursor-pointer">
              {barbers.map((b)=><option key={b.id} value={b.id}>{b.displayName}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {barbers.map((barber)=><div key={barber.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex justify-between gap-3"><div><b>{barber.displayName}</b><p className="text-xs text-zinc-400">Comisión: {barber.commissionRate ?? 100}%</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>editBarberCommission(barber)} className="text-amber-400 text-xs cursor-pointer">Editar %</button><button onClick={()=>openAdvance(barber.id)} className="text-red-400 text-xs cursor-pointer">+ Adelanto</button><button onClick={()=>deactivateBarber(barber)} className="text-red-500 text-xs font-bold cursor-pointer">Eliminar</button></div></div>
          </div>)}
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <h3 className="font-bold text-red-400">Adelantos pendientes</h3>
          <b className="text-xl">− {formatMoney(pending.advancesDeducted)}</b>
          {pending.advances.map((advance)=><label key={advance.id} className="flex items-center justify-between gap-3 mt-2 bg-red-950/20 border border-red-500/20 rounded-xl px-3 py-2 cursor-pointer"><div className="flex items-center gap-2"><input type="checkbox" checked={selectedAdvanceIds.includes(advance.id)} onChange={(e)=>setSelectedAdvanceIds((current)=>e.target.checked?[...current,advance.id]:current.filter((id)=>id!==advance.id))}/><p className="text-xs text-zinc-300">{new Date(advance.createdAt).toLocaleDateString('es-AR')} · {advance.description || advance.category} · <b>{formatMoney(advance.amount)}</b></p></div><button type="button" onClick={()=>deleteAdvance(advance)} className="text-red-400 text-xs font-bold cursor-pointer">Anular</button></label>)}
        </div>
        <button onClick={()=>setSelectedDates(pending.days.map((day)=>day.date))} className="border border-zinc-700 px-3 py-2 rounded-xl text-sm cursor-pointer">Seleccionar todos</button>
        <div className="space-y-3">{pending.days.map((day)=>{const barber=barbers.find((b)=>String(b.id)===String(settlementBarberId));const commission=Number(day.grossAmount||0)*(Number(barber?.commissionRate??100)/100);return <label key={day.date} className="flex gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer"><input type="checkbox" checked={selectedDates.includes(day.date)} onChange={(e)=>setSelectedDates((current)=>e.target.checked?[...current,day.date]:current.filter((date)=>date!==day.date))}/><div><b>{new Date(`${day.date}T12:00:00`).toLocaleDateString('es-AR')}</b><p className="text-xs text-zinc-400">{day.servicesCount} servicios · Facturación {formatMoney(day.grossAmount)} · Comisión {formatMoney(commission)}</p></div></label>})}</div>
        <button onClick={liquidate} disabled={!selectedDates.length} className="bg-emerald-500 text-zinc-950 font-extrabold px-5 py-3 rounded-xl disabled:opacity-40 cursor-pointer">Liquidar selección</button>
      </div>}

      {tab==='stock' && <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[['PRODUCT','Productos'],['BEVERAGE','Bebidas']].map(([group,title])=><div key={group}><div className="flex justify-between mb-3"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={()=>addProduct(group)} className="bg-amber-500 text-zinc-950 px-3 py-2 rounded-xl text-sm font-bold">+ Agregar</button></div><div className="space-y-3">{products.filter((p)=>p.itemGroup===group).map((product)=><div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><div className="flex justify-between"><div><b>{product.name}</b><p className="text-xs text-zinc-400">{formatMoney(product.price)}</p></div><span className={`text-xs px-2 py-1 rounded-full ${product.stock>product.minStock?'bg-emerald-500/15 text-emerald-400':'bg-red-500/15 text-red-400'}`}>Stock {product.stock}</span></div><div className="flex flex-wrap gap-2 mt-3"><button onClick={()=>adjustStock(product,-1)} className="px-3 py-1.5 border border-zinc-700 rounded-lg">−1</button><button onClick={()=>adjustStock(product,1)} className="px-3 py-1.5 border border-zinc-700 rounded-lg">+1</button><button onClick={()=>adjustStock(product,6)} className="px-3 py-1.5 border border-zinc-700 rounded-lg">+6 Pack</button><button onClick={()=>editProduct(product)} className="px-3 py-1.5 border border-amber-500/30 text-amber-400 rounded-lg">Editar</button><button onClick={()=>deleteProduct(product)} className="px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg">Borrar</button></div></div>)}</div></div>)}</div>}

      {tab==='servicios' && <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2 space-y-3"><h1 className="text-2xl font-extrabold">Cortes y Precios</h1>{services.map((service)=><div key={service.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex justify-between"><div><b className="text-lg">{service.name}</b><p className="text-xs text-zinc-400">{service.durationMinutes} min</p>{service.imageUrl&&<p className="text-[10px] text-zinc-500 max-w-xs truncate">Imagen local según el servicio</p>}</div><div className="flex items-center gap-3"><b className="text-amber-400">{formatMoney(service.price)}</b><button onClick={()=>editService(service)} className="text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl text-sm cursor-pointer"><Pencil className="w-4 h-4 inline mr-1"/>Editar</button><button onClick={()=>deleteService(service)} className="text-red-400 border border-red-500/30 px-3 py-2 rounded-xl text-sm cursor-pointer"><Trash2 className="w-4 h-4 inline mr-1"/>Eliminar</button></div></div>)}</div><form onSubmit={createService} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3 h-fit"><h2 className="font-bold">Nuevo Corte / Servicio</h2><input name="name" required placeholder="Nombre" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input name="description" placeholder="Descripción" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><div className="grid grid-cols-2 gap-3"><input name="price" required type="number" placeholder="Precio" className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input name="durationMinutes" required type="number" placeholder="Minutos" className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/></div><button className="w-full bg-amber-500 text-zinc-950 font-extrabold py-3 rounded-xl cursor-pointer">Agregar Servicio</button></form></div>}

      {tab==='analytics' && <div className="space-y-5"><h1 className="text-2xl font-extrabold">Analytics</h1>{analytics&&<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><p className="text-xs text-zinc-400">Facturación total</p><b className="text-2xl text-amber-400">{formatMoney(analytics.totalRevenue)}</b></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><p className="text-xs text-zinc-400">Ticket promedio</p><b className="text-2xl">{formatMoney(analytics.averageTicket)}</b></div><div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><p className="text-xs text-zinc-400">Clientes nuevos / frecuentes</p><b className="text-2xl">{analytics.customersAttended.new} / {analytics.customersAttended.frequent}</b></div></div>}</div>}

      {tab==='seguridad' && <div className="space-y-4"><h1 className="text-2xl font-extrabold">Seguridad / PINs</h1>{pins.map((action)=><div key={action.actionKey} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex justify-between"><div><b>{action.label}</b><p className="text-xs text-zinc-500">{action.actionKey}</p></div><div className="flex gap-3"><span className={`text-xs px-2 py-1 rounded-full ${action.pin?'bg-emerald-500/15 text-emerald-400':'bg-zinc-800 text-zinc-400'}`}>{action.pin?'Configurada':'Sin configurar'}</span><button onClick={()=>updatePin(action)} className="border border-zinc-700 px-3 py-2 rounded-xl text-sm">Cambiar</button></div></div>)}</div>}

      {cashModal && <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"><form onSubmit={submitMovement} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"><h3 className="font-extrabold text-xl">Registrar movimiento</h3><select value={movementForm.category} onChange={(e)=>setMovementForm({...movementForm,category:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option>Adelanto</option><option>Insumos</option><option>Servicios</option><option>Ingreso extra</option><option>Otros</option></select>{movementForm.category==='Adelanto'&&<><select value={movementForm.barberId} onChange={(e)=>setMovementForm({...movementForm,barberId:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option value="">Elegir barbero</option>{barbers.map((b)=><option key={b.id} value={b.id}>{b.displayName}</option>)}</select><p className="text-xs text-red-400">Se descuenta de la próxima liquidación.</p></>}<input value={movementForm.description} onChange={(e)=>setMovementForm({...movementForm,description:e.target.value})} placeholder="Descripción" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input type="number" value={movementForm.amount} onChange={(e)=>setMovementForm({...movementForm,amount:e.target.value})} placeholder="Monto" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><select value={movementForm.paymentMethod} onChange={(e)=>setMovementForm({...movementForm,paymentMethod:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option>CASH</option><option>TRANSFER</option><option>QR</option><option>SOCIOS</option></select><div className="flex gap-2"><button type="button" onClick={()=>setCashModal(false)} className="flex-1 border border-zinc-700 py-3 rounded-xl">Cancelar</button><button className="flex-1 bg-amber-500 text-zinc-950 font-extrabold py-3 rounded-xl">Guardar</button></div></form></div>}
      {advanceModal && <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"><form onSubmit={submitAdvance} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"><h3 className="font-extrabold text-xl">Registrar adelanto</h3><select value={advanceForm.barberId} onChange={(e)=>setAdvanceForm({...advanceForm,barberId:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option value="">Elegir barbero</option>{barbers.map((b)=><option key={b.id} value={b.id}>{b.displayName}</option>)}</select><input value={advanceForm.description} onChange={(e)=>setAdvanceForm({...advanceForm,description:e.target.value})} placeholder="Descripción" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input type="number" value={advanceForm.amount} onChange={(e)=>setAdvanceForm({...advanceForm,amount:e.target.value})} placeholder="Monto" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><select value={advanceForm.paymentMethod} onChange={(e)=>setAdvanceForm({...advanceForm,paymentMethod:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option>CASH</option><option>TRANSFER</option><option>QR</option><option>SOCIOS</option></select><div className="flex gap-2"><button type="button" onClick={()=>setAdvanceModal(false)} className="flex-1 border border-zinc-700 py-3 rounded-xl">Cancelar</button><button className="flex-1 bg-amber-500 text-zinc-950 font-extrabold py-3 rounded-xl">Guardar</button></div></form></div>}
      {barberModal && <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"><form onSubmit={createBarber} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"><h3 className="font-extrabold text-xl">Nuevo Peluquero</h3><input required value={barberForm.name} onChange={(e)=>setBarberForm({...barberForm,name:e.target.value})} placeholder="Nombre completo" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input required value={barberForm.username} onChange={(e)=>setBarberForm({...barberForm,username:e.target.value})} placeholder="Usuario" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><input required type="password" minLength="6" value={barberForm.password} onChange={(e)=>setBarberForm({...barberForm,password:e.target.value})} placeholder="Contraseña" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><select value={barberForm.role} onChange={(e)=>setBarberForm({...barberForm,role:e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"><option value="BARBER">Empleado</option><option value="ADMIN">Dueño</option></select><input required type="number" min="0" max="100" value={barberForm.commissionRate} onChange={(e)=>setBarberForm({...barberForm,commissionRate:e.target.value})} placeholder="Porcentaje de comisión" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5"/><div className="flex gap-2"><button type="button" onClick={()=>setBarberModal(false)} className="flex-1 border border-zinc-700 py-3 rounded-xl cursor-pointer">Cancelar</button><button className="flex-1 bg-amber-500 text-zinc-950 font-extrabold py-3 rounded-xl cursor-pointer">Crear Peluquero</button></div></form></div>}
    </main>
  </div>;
}