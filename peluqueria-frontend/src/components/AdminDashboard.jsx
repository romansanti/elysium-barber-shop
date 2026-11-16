import { useState, useEffect } from 'react';
import {
  Scissors, Calendar, DollarSign, Package, LogOut, ArrowLeft,
  Plus, Minus, AlertTriangle, ShoppingBag, Users, History,
  ArrowUpRight, ArrowDownLeft, Clock, Trash2, Pencil
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AdminDashboard({ onBackToPublic }) {
  const [token, setToken] = useState(localStorage.getItem('barber_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('barber_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [username, setUsername] = useState('marcosmayo23');
  const [password, setPassword] = useState('admin32');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('caja');
  const [now, setNow] = useState(new Date());

  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [services, setServices] = useState([]);
  const [sales, setSales] = useState([]);
  const [loadWarning, setLoadWarning] = useState('');

  // Filtros (Hoy arranca en $0 automáticamente cada día)
  const [agendaBarberFilter, setAgendaBarberFilter] = useState('ALL');
  const [historyPeriod, setHistoryPeriod] = useState('TODAY');
  const [historyBarberFilter, setHistoryBarberFilter] = useState('ALL');
  const [commissionPeriod, setCommissionPeriod] = useState('TODAY');

  // Caja (POS)
  const [cart, setCart] = useState([]);
  const [selectedSaleBarberId, setSelectedSaleBarberId] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(null);
  const [linkedCustomerId, setLinkedCustomerId] = useState(null);
  const [saleMessage, setSaleMessage] = useState('');

  // Altas
  const [newBarber, setNewBarber] = useState({ displayName: '', email: '', password: '', commissionRate: '50' });
  const [stockReason, setStockReason] = useState('');
  const [newProd, setNewProd] = useState({ name: '', categoryName: 'Bebidas', price: '', costPrice: '', stock: '', minStock: '5' });
  const [newSrv, setNewSrv] = useState({ name: '', description: '', price: '', durationMinutes: '30' });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('barber_token');
    localStorage.removeItem('barber_user');
    setToken('');
    setUser(null);
  };

  const loadAllData = async () => {
    setLoadWarning('');
    const results = await Promise.allSettled([
      apiRequest('/appointments'),
      apiRequest('/barbers'),
      apiRequest('/products'),
      apiRequest('/products/movements'),
      apiRequest('/services'),
      apiRequest('/sales'),
    ]);

    const [apptsRes, brbsRes, prodsRes, movsRes, srvsRes, slsRes] = results;
    const failed = results.find((r) => r.status === 'rejected');
    if (failed && failed.reason?.message?.includes('Token')) {
      handleLogout();
      return;
    }

    if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value);
    else setLoadWarning(`No se pudieron cargar los turnos: ${apptsRes.reason?.message}`);

    if (brbsRes.status === 'fulfilled') {
      setBarbers(brbsRes.value);
      if (brbsRes.value.length > 0 && !brbsRes.value.some((b) => b.id === selectedSaleBarberId)) {
        setSelectedSaleBarberId(user?.barberId || brbsRes.value[0].id);
      }
    }
    if (prodsRes.status === 'fulfilled') setProducts(prodsRes.value);
    if (movsRes.status === 'fulfilled') setStockMovements(movsRes.value);
    if (srvsRes.status === 'fulfilled') setServices(srvsRes.value);
    if (slsRes.status === 'fulfilled') setSales(slsRes.value);
  };

  useEffect(() => {
    if (token) {
      if (user?.barberId) setSelectedSaleBarberId(user.barberId);
      loadAllData();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('barber_token', data.token);
      localStorage.setItem('barber_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiRequest(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const sendAppointmentToPOS = (appt) => {
    setLinkedAppointmentId(appt.id);
    setLinkedCustomerId(appt.customerId);
    setSelectedSaleBarberId(appt.barberId);
    setCart([{ itemType: 'SERVICE', serviceId: appt.serviceId, name: appt.service.name, price: Number(appt.priceSnapshot), quantity: 1 }]);
    setActiveTab('caja');
  };

  const addToCart = (item, type) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) =>
        type === 'SERVICE' ? i.itemType === 'SERVICE' && i.serviceId === item.id : i.itemType === 'PRODUCT' && i.productId === item.id
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, {
        itemType: type,
        ...(type === 'SERVICE' ? { serviceId: item.id } : { productId: item.id }),
        name: item.name,
        price: Number(item.price),
        quantity: 1,
      }];
    });
  };

  const removeFromCart = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify({
          barberId: Number(selectedSaleBarberId),
          customerId: linkedCustomerId,
          appointmentId: linkedAppointmentId,
          items: cart.map((i) => ({
            itemType: i.itemType,
            ...(i.serviceId ? { serviceId: i.serviceId } : { productId: i.productId }),
            quantity: i.quantity,
          })),
          payments: [{ method: paymentMethod, amount: cartTotal }],
        }),
      });
      const horaCobro = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const barberoNombre = barbers.find((b) => b.id === Number(selectedSaleBarberId))?.displayName || '';
      setCart([]);
      setLinkedAppointmentId(null);
      setLinkedCustomerId(null);
      setSaleMessage(`¡Anotado a las ${horaCobro} hs (${barberoNombre})!`);
      setTimeout(() => setSaleMessage(''), 4000);
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleCreateBarber = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/barbers', { method: 'POST', body: JSON.stringify(newBarber) });
      setNewBarber({ displayName: '', email: '', password: '', commissionRate: '50' });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleUpdateCommission = async (barberId, currentRate) => {
    const nuevo = prompt('Porcentaje que cobra este barbero por corte (ej: 50 o 100):', currentRate);
    if (!nuevo || isNaN(nuevo) || Number(nuevo) < 0 || Number(nuevo) > 100) return;
    try {
      await apiRequest(`/barbers/${barberId}`, { method: 'PATCH', body: JSON.stringify({ commissionRate: Number(nuevo) }) });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteSale = async (saleId, label, itemsCount) => {
    const avisoExtra = itemsCount > 1 ? '\n(Este cobro tiene más de 1 ítem en el mismo ticket y se anulará el ticket completo).' : '';
    if (!window.confirm(`¿Anular "${label}"? Se descontará de la caja y devolverá el stock si era bebida.${avisoExtra}`)) return;
    try {
      await apiRequest(`/sales/${saleId}`, { method: 'DELETE' });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleAdjustStock = async (productId, type, qty = 1) => {
    try {
      await apiRequest(`/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ type, quantity: qty, reason: stockReason.trim() || (type === 'IN' ? 'Reposición rápida' : 'Baja rápida') }),
      });
      setStockReason('');
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/products', { method: 'POST', body: JSON.stringify(newProd) });
      setNewProd({ name: '', categoryName: 'Bebidas', price: '', costPrice: '', stock: '', minStock: '5' });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleEditProduct = async (prod) => {
    const nuevoNombre = prompt('Nombre de la bebida / producto:', prod.name);
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    const nuevoPrecio = prompt('Precio de venta ($):', prod.price);
    if (!nuevoPrecio || isNaN(nuevoPrecio)) return;
    try {
      await apiRequest(`/products/${prod.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nuevoNombre.trim(), price: Number(nuevoPrecio) }),
      });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`¿Seguro que querés borrar "${prod.name}" del inventario?`)) return;
    try {
      await apiRequest(`/products/${prod.id}`, { method: 'DELETE' });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/services', { method: 'POST', body: JSON.stringify(newSrv) });
      setNewSrv({ name: '', description: '', price: '', durationMinutes: '30' });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const handleUpdateServicePrice = async (id, currentPrice) => {
    const nuevo = prompt('Nuevo precio para este servicio:', currentPrice);
    if (!nuevo || isNaN(nuevo)) return;
    try {
      await apiRequest(`/services/${id}`, { method: 'PATCH', body: JSON.stringify({ price: Number(nuevo) }) });
      loadAllData();
    } catch (err) { alert(err.message); }
  };

  const formatPrice = (val) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const formatPayMethod = (m) => (m === 'TRANSFER' ? 'Transferencia / MP' : m === 'CARD' ? 'Tarjeta' : 'Efectivo');

  const isTodayLocal = (dateStr) =>
    new Date(dateStr).toLocaleDateString('es-AR') === now.toLocaleDateString('es-AR');

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <button onClick={onBackToPublic} className="text-sm text-zinc-400 hover:text-amber-400 flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver a la web pública
          </button>
          <div className="text-center space-y-2">
            <img src="/logo.png" alt="Elysium Barber Shop" className="h-24 mx-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h2 className="text-2xl font-bold">Acceso Elysium Barber Shop</h2>
            <p className="text-xs text-zinc-400">Panel de gestión del local (Marcos y Gonzalo).</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Usuario</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-500" required />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-500" required />
            </div>
            {loginError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">{loginError}</div>}
            <button type="submit" disabled={loginLoading} className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3.5 rounded-xl transition cursor-pointer text-base">
              {loginLoading ? 'Ingresando...' : 'Entrar al Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Datos filtrados para Historial (Cortes y Bebidas)
  const historySales = sales
    .filter((s) => (historyPeriod === 'TODAY' ? isTodayLocal(s.createdAt) : true))
    .filter((s) => (historyBarberFilter === 'ALL' ? true : String(s.barberId) === String(historyBarberFilter)));

  const drinkHistoryRows = [];
  const cutHistoryRows = [];
  let histTotalBebidas = 0;
  let histCantBebidas = 0;
  let histTotalCortes = 0;
  let histCantCortes = 0;
  let histEfectivo = 0;
  let histTransferencia = 0;
  let histTarjeta = 0;

  historySales.forEach((s) => {
    const barberName = s.barber?.displayName || barbers.find((b) => b.id === s.barberId)?.displayName || 'Sin asignar';
    const method = s.payments?.[0]?.method || 'CASH';
    const totalSale = Number(s.total || 0);
    const itemsCount = (s.items || []).length;

    if (method === 'TRANSFER') histTransferencia += totalSale;
    else if (method === 'CARD') histTarjeta += totalSale;
    else histEfectivo += totalSale;

    (s.items || []).forEach((it) => {
      const sub = Number(it.subtotal || 0);
      if (it.itemType === 'PRODUCT') {
        histTotalBebidas += sub;
        histCantBebidas += Number(it.quantity || 1);
        drinkHistoryRows.push({
          key: `${s.id}-p-${it.id}`,
          saleId: s.id,
          itemsCount,
          createdAt: s.createdAt,
          name: it.product?.name || 'Bebida / Producto',
          quantity: it.quantity,
          barberName,
          method,
          subtotal: sub,
        });
      } else {
        histTotalCortes += sub;
        histCantCortes += Number(it.quantity || 1);
        cutHistoryRows.push({
          key: `${s.id}-s-${it.id}`,
          saleId: s.id,
          itemsCount,
          createdAt: s.createdAt,
          name: it.service?.name || 'Corte / Servicio',
          quantity: it.quantity,
          barberName,
          method,
          subtotal: sub,
        });
      }
    });
  });

  const commissionSales = commissionPeriod === 'TODAY' ? sales.filter((s) => isTodayLocal(s.createdAt)) : sales;
  const cajaHoy = sales.filter((s) => isTodayLocal(s.createdAt)).reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalRecaudado = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);

  const visibleAppointments = agendaBarberFilter === 'ALL'
    ? appointments
    : appointments.filter((a) => String(a.barberId) === String(agendaBarberFilter));

  const navItems = [
    { id: 'caja', label: 'Anotar Corte', sub: 'Cortes y bebidas', icon: DollarSign },
    { id: 'historial', label: 'Historial Ventas', sub: 'Bebidas y cortes + hora', icon: History },
    { id: 'agenda', label: 'Turnos', sub: 'Agenda por barbero', icon: Calendar },
    { id: 'equipo', label: 'Comisiones (%)', sub: 'Marcos y Gonzalo', icon: Users },
    { id: 'stock', label: 'Stock y Movs', sub: 'Bebidas y productos', icon: Package },
    { id: 'servicios', label: 'Precios', sub: 'Cortes y valores', icon: Scissors },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row">
      <aside className="w-full lg:w-72 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <img src="/logo.png" alt="Elysium" className="h-12 w-12 object-contain rounded-lg bg-black p-0.5 border border-zinc-700" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div>
              <h1 className="font-extrabold text-base tracking-wide leading-tight">ELYSIUM</h1>
              <p className="text-xs text-amber-400 font-semibold">PC Local · {user?.name}</p>
              <p className="text-xs text-zinc-400">Caja de Hoy: <span className="text-emerald-400 font-bold">{formatPrice(cajaHoy)}</span></p>
            </div>
          </div>

          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition cursor-pointer border ${
                    isActive ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/10' : 'bg-zinc-950/70 text-zinc-200 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/70'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-zinc-950/15' : 'bg-zinc-900 text-amber-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-extrabold text-sm leading-tight">{tab.label}</span>
                    <span className={`block text-xs mt-0.5 ${isActive ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>{tab.sub}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-5 mt-5 border-t border-zinc-800 flex flex-col gap-2">
          <button onClick={loadAllData} className="w-full text-sm font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 py-2.5 rounded-xl transition cursor-pointer">
            Actualizar Datos
          </button>
          <button onClick={onBackToPublic} className="w-full text-sm font-bold bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl transition cursor-pointer">
            Ver Página de Clientes
          </button>
          <button onClick={handleLogout} className="w-full text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        {loadWarning && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl">{loadWarning}</div>}

        {/* PESTAÑA 1: ANOTAR CORTE / BEBIDA */}
        {activeTab === 'caja' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
                    1. ¿Quién hizo el corte o vendió la bebida?
                  </label>
                  <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Hora automática: <strong className="text-white">{now.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {barbers.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setSelectedSaleBarberId(b.id)}
                      className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                        Number(selectedSaleBarberId) === b.id
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                          : 'bg-zinc-950 text-zinc-200 border-zinc-800 hover:border-amber-500/50'
                      }`}
                    >
                      <p className="text-base font-extrabold">{b.displayName}</p>
                      <p className={`text-xs mt-0.5 ${Number(selectedSaleBarberId) === b.id ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}`}>
                        Porcentaje: {b.commissionRate ?? 100}%
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 mb-3">2. Elegir Corte / Servicio</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {services.map((srv) => (
                    <button key={srv.id} onClick={() => addToCart(srv, 'SERVICE')} className="bg-zinc-900 hover:border-amber-500 border border-zinc-800 p-4 rounded-2xl text-left transition cursor-pointer">
                      <p className="font-bold text-base">{srv.name}</p>
                      <p className="text-amber-400 font-extrabold text-base mt-1">{formatPrice(srv.price)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 mb-3">3. Sumar Bebida / Producto</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.map((prod) => (
                    <button key={prod.id} disabled={prod.stock <= 0} onClick={() => addToCart(prod, 'PRODUCT')} className="bg-zinc-900 hover:border-amber-500 disabled:opacity-40 border border-zinc-800 p-4 rounded-2xl text-left transition cursor-pointer">
                      <p className="font-bold text-base">{prod.name}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-amber-400 font-extrabold text-base">{formatPrice(prod.price)}</span>
                        <span className="text-xs text-zinc-400">Stock: {prod.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 h-fit">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-amber-500" /> Ticket Actual</h3>
                  <span className="text-xs bg-amber-500/15 text-amber-400 font-bold px-3 py-1.5 rounded-lg">
                    {barbers.find((b) => b.id === Number(selectedSaleBarberId))?.displayName || 'Barbero'}
                  </span>
                </div>
                {cart.length === 0 ? (
                  <p className="text-zinc-500 text-sm py-8 text-center">Tocá un corte o bebida para anotar el cobro.</p>
                ) : (
                  <div className="space-y-2.5">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-950 p-3.5 rounded-xl text-sm">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-zinc-400">{item.quantity} x {formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-base">{formatPrice(item.price * item.quantity)}</span>
                          <button onClick={() => removeFromCart(idx)} className="text-zinc-500 hover:text-red-400 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Medio de Pago</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm">
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia / Mercado Pago</option>
                    <option value="CARD">Tarjeta Débito / Crédito</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-xl font-extrabold">
                  <span>Total:</span>
                  <span className="text-amber-400">{formatPrice(cartTotal)}</span>
                </div>
                {saleMessage && <p className="text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl text-center font-semibold">{saleMessage}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setCart([]); setLinkedAppointmentId(null); }} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-3.5 rounded-xl text-sm font-bold cursor-pointer">Limpiar</button>
                  <button onClick={handleCheckout} disabled={cart.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold py-3.5 rounded-xl text-base transition cursor-pointer">
                    Registrar Cobro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: HISTORIAL DE BEBIDAS Y CORTES CON HORA AUTOMÁTICA */}
        {activeTab === 'historial' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Historial de Bebidas y Cortes</h2>
                <p className="text-xs text-zinc-400">Cada día arranca en $ 0 automáticamente. Si hubo un error al anotar, podés anular la fila con el tacho rojo.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                  <button onClick={() => setHistoryPeriod('TODAY')} className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${historyPeriod === 'TODAY' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>Hoy</button>
                  <button onClick={() => setHistoryPeriod('ALL')} className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${historyPeriod === 'ALL' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>Histórico Total</button>
                </div>
                <div className="flex gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                  <button onClick={() => setHistoryBarberFilter('ALL')} className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${historyBarberFilter === 'ALL' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>Todos</button>
                  {barbers.map((b) => (
                    <button key={b.id} onClick={() => setHistoryBarberFilter(String(b.id))} className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${String(historyBarberFilter) === String(b.id) ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>
                      {b.displayName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tarjetas resumen del período filtrado */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs text-amber-400 font-semibold">Bebidas Vendidas ({histCantBebidas})</p>
                <p className="text-xl font-extrabold text-amber-400 mt-1">{formatPrice(histTotalBebidas)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400 font-semibold">Cortes Hechos ({histCantCortes})</p>
                <p className="text-xl font-extrabold text-white mt-1">{formatPrice(histTotalCortes)}</p>
              </div>
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4">
                <p className="text-xs text-emerald-400 font-semibold">Efectivo</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{formatPrice(histEfectivo)}</p>
              </div>
              <div className="bg-zinc-900 border border-sky-500/30 rounded-2xl p-4">
                <p className="text-xs text-sky-400 font-semibold">Transferencia / MP</p>
                <p className="text-xl font-extrabold text-sky-400 mt-1">{formatPrice(histTransferencia)}</p>
              </div>
              <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-4">
                <p className="text-xs text-purple-400 font-semibold">Tarjeta</p>
                <p className="text-xl font-extrabold text-purple-400 mt-1">{formatPrice(histTarjeta)}</p>
              </div>
            </div>

            {/* TABLA A: HISTORIAL DE BEBIDAS VENDIDAS */}
            <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-amber-400">Historial de Ventas de Bebidas / Productos</h3>
                <span className="text-xs text-zinc-400">{drinkHistoryRows.length} registros</span>
              </div>
              {drinkHistoryRows.length === 0 ? (
                <p className="text-sm text-zinc-500">Todavía no hay bebidas vendidas en este filtro.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                        <th className="py-3 px-3">Fecha y Hora Exacta</th>
                        <th className="py-3 px-3">Bebida / Producto</th>
                        <th className="py-3 px-3">Cant.</th>
                        <th className="py-3 px-3">Anotado por</th>
                        <th className="py-3 px-3">Medio de Pago</th>
                        <th className="py-3 px-3">Monto</th>
                        <th className="py-3 px-3 text-right">Anular</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {drinkHistoryRows.map((row) => (
                        <tr key={row.key} className="hover:bg-zinc-950/50">
                          <td className="py-3 px-3 text-xs text-zinc-300 font-mono">
                            {new Date(row.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{row.name}</td>
                          <td className="py-3 px-3 font-semibold">{row.quantity}x</td>
                          <td className="py-3 px-3 text-zinc-200">{row.barberName}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${row.method === 'CASH' ? 'bg-emerald-500/15 text-emerald-400' : row.method === 'TRANSFER' ? 'bg-sky-500/15 text-sky-400' : 'bg-purple-500/15 text-purple-400'}`}>
                              {formatPayMethod(row.method)}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-amber-400">{formatPrice(row.subtotal)}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteSale(row.saleId, `${row.quantity}x ${row.name}`, row.itemsCount)}
                              title="Anular venta equivocada"
                              className="bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 p-2 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* TABLA B: HISTORIAL DE CORTES REALIZADOS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">Historial de Cortes Realizados</h3>
                <span className="text-xs text-zinc-400">{cutHistoryRows.length} cortes</span>
              </div>
              {cutHistoryRows.length === 0 ? (
                <p className="text-sm text-zinc-500">Todavía no hay cortes anotados en este filtro.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                        <th className="py-3 px-3">Fecha y Hora Exacta</th>
                        <th className="py-3 px-3">Corte / Servicio</th>
                        <th className="py-3 px-3">Barbero</th>
                        <th className="py-3 px-3">Medio de Pago</th>
                        <th className="py-3 px-3">Monto</th>
                        <th className="py-3 px-3 text-right">Anular</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {cutHistoryRows.map((row) => (
                        <tr key={row.key} className="hover:bg-zinc-950/50">
                          <td className="py-3 px-3 text-xs text-zinc-300 font-mono">
                            {new Date(row.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{row.name} {row.quantity > 1 ? `(${row.quantity}x)` : ''}</td>
                          <td className="py-3 px-3 font-semibold text-amber-400">{row.barberName}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${row.method === 'CASH' ? 'bg-emerald-500/15 text-emerald-400' : row.method === 'TRANSFER' ? 'bg-sky-500/15 text-sky-400' : 'bg-purple-500/15 text-purple-400'}`}>
                              {formatPayMethod(row.method)}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-emerald-400">{formatPrice(row.subtotal)}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteSale(row.saleId, `${row.name} (${row.barberName})`, row.itemsCount)}
                              title="Anular corte equivocado"
                              className="bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 p-2 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: AGENDA POR PELUQUERO */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Turnos Agendados ({visibleAppointments.length})</h2>
                <p className="text-sm text-zinc-400">Filtrá por barbero para ver los turnos de cada uno.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800">
                <button onClick={() => setAgendaBarberFilter('ALL')} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${agendaBarberFilter === 'ALL' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-300 hover:text-white'}`}>
                  Todos ({appointments.length})
                </button>
                {barbers.map((b) => (
                  <button key={b.id} onClick={() => setAgendaBarberFilter(String(b.id))} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${String(agendaBarberFilter) === String(b.id) ? 'bg-amber-500 text-zinc-950' : 'text-zinc-300 hover:text-white'}`}>
                    {b.displayName} ({appointments.filter((a) => a.barberId === b.id).length})
                  </button>
                ))}
              </div>
            </div>

            {visibleAppointments.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 text-base">
                No hay turnos registrados para este filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visibleAppointments.map((appt) => (
                  <div key={appt.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold bg-zinc-800 px-3 py-1 rounded-lg text-amber-400">
                        {appt.appointmentDate.split('T')[0]} · {appt.startTime} hs
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${appt.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' : appt.status === 'CANCELLED' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Barbero:</span>
                      <span className="font-bold text-white text-sm">{appt.barber.displayName}</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{appt.customer.firstName} {appt.customer.lastName}</p>
                      <p className="text-xs text-zinc-400">WhatsApp: {appt.customer.whatsapp}</p>
                      <p className="text-sm text-zinc-200 mt-1.5 font-medium">{appt.service.name} ({formatPrice(appt.priceSnapshot)})</p>
                      {appt.notes && <p className="text-xs text-amber-300/90 mt-1">Nota: {appt.notes}</p>}
                    </div>
                    {appt.status === 'CONFIRMED' && (
                      <div className="pt-3 border-t border-zinc-800 flex gap-2">
                        <button onClick={() => sendAppointmentToPOS(appt)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 px-3 rounded-xl transition cursor-pointer">
                          Cobrar en Caja
                        </button>
                        <button onClick={() => handleStatusChange(appt.id, 'CANCELLED')} className="bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-sm font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 4: COMISIONES (%) */}
        {activeTab === 'equipo' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">Liquidación por Barbero</h2>
                  <p className="text-xs text-zinc-400">En "Hoy" arranca en $ 0 cada día. El porcentaje se calcula sobre los cortes (las bebidas quedan 100% para el local).</p>
                </div>
                <div className="flex gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                  <button onClick={() => setCommissionPeriod('TODAY')} className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${commissionPeriod === 'TODAY' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>Hoy</button>
                  <button onClick={() => setCommissionPeriod('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${commissionPeriod === 'ALL' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'}`}>Histórico Total</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {barbers.map((barber) => {
                  const barberSales = commissionSales.filter((s) => s.barberId === barber.id);
                  let cutsCount = 0; let servicesRevenue = 0; let productsRevenue = 0;
                  barberSales.forEach((s) => (s.items || []).forEach((it) => {
                    if (it.itemType === 'SERVICE') { cutsCount += it.quantity; servicesRevenue += Number(it.subtotal || 0); }
                    else { productsRevenue += Number(it.subtotal || 0); }
                  }));
                  const rate = barber.commissionRate ?? 100;
                  const barberCut = (servicesRevenue * rate) / 100;
                  const shopCut = servicesRevenue - barberCut + productsRevenue;
                  return (
                    <div key={barber.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-xl text-white">{barber.displayName}</h3>
                          <p className="text-xs text-zinc-400">{barber.user?.email}</p>
                        </div>
                        <button onClick={() => handleUpdateCommission(barber.id, rate)} className="text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold px-3 py-2 rounded-xl cursor-pointer">
                          Cobra {rate}% (Editar)
                        </button>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2.5 text-sm">
                        <div className="flex justify-between"><span className="text-zinc-400">Cortes realizados:</span><span className="font-bold">{cutsCount}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Total en cortes:</span><span className="font-semibold">{formatPrice(servicesRevenue)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Bebidas anotadas:</span><span className="font-semibold">{formatPrice(productsRevenue)}</span></div>
                        <div className="pt-2.5 border-t border-zinc-800 flex justify-between text-base font-extrabold">
                          <span className="text-emerald-400">Le corresponde ({rate}%):</span>
                          <span className="text-emerald-400">{formatPrice(barberCut)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-400"><span>Queda para Elysium:</span><span>{formatPrice(shopCut)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <form onSubmit={handleCreateBarber} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="font-bold text-lg">Agregar Otro Barbero</h3>
              <input type="text" placeholder="Nombre y Apellido" value={newBarber.displayName} onChange={(e) => setNewBarber({ ...newBarber, displayName: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              <input type="email" placeholder="Email de acceso" value={newBarber.email} onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              <input type="password" placeholder="Contraseña" value={newBarber.password} onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Porcentaje por corte (%)</label>
                <input type="number" min="1" max="100" value={newBarber.commissionRate} onChange={(e) => setNewBarber({ ...newBarber, commissionRate: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3.5 rounded-xl text-sm transition cursor-pointer">Dar de Alta Barbero</button>
            </form>
          </div>
        )}

        {/* PESTAÑA 5: STOCK Y MOVIMIENTOS */}
        {activeTab === 'stock' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-extrabold">Inventario Actual</h2>
                  <input type="text" placeholder="Motivo opcional antes de sumar/restar..." value={stockReason} onChange={(e) => setStockReason(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm w-72" />
                </div>
                <div className="space-y-3">
                  {products.map((prod) => {
                    const isLow = prod.stock <= prod.minStock;
                    return (
                      <div key={prod.id} className={`bg-zinc-900 border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 ${isLow ? 'border-red-500/40' : 'border-zinc-800'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{prod.name}</h3>
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded">{prod.category?.name}</span>
                            {isLow && <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Stock bajo</span>}
                          </div>
                          <p className="text-sm text-zinc-400 mt-1">Venta: <span className="text-amber-400 font-bold">{formatPrice(prod.price)}</span> · Costo: {formatPrice(prod.costPrice)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => handleAdjustStock(prod.id, 'OUT', 1)} title="Restar 1" className="bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 p-2.5 rounded-xl transition cursor-pointer"><Minus className="w-4 h-4" /></button>
                          <span className="w-12 text-center font-extrabold text-xl">{prod.stock}</span>
                          <button onClick={() => handleAdjustStock(prod.id, 'IN', 1)} title="Sumar 1" className="bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 p-2.5 rounded-xl transition cursor-pointer"><Plus className="w-4 h-4" /></button>
                          <button onClick={() => handleAdjustStock(prod.id, 'IN', 6)} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition cursor-pointer">+6 Pack</button>
                          <button onClick={() => handleEditProduct(prod)} title="Editar nombre o precio" className="bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-400 border border-zinc-700 p-2.5 rounded-xl transition cursor-pointer"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteProduct(prod)} title="Borrar producto" className="bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 p-2.5 rounded-xl transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <form onSubmit={handleCreateProduct} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
                <h3 className="font-bold text-lg">Agregar Producto Nuevo</h3>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nombre del producto / bebida</label>
                  <input type="text" placeholder="Ej: Speed, Cerveza Corona, Cera..." value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Categoría</label>
                  <input type="text" placeholder="Bebidas, Styling..." value={newProd.categoryName} onChange={(e) => setNewProd({ ...newProd, categoryName: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Precio Venta ($)</label>
                    <input type="number" placeholder="Ej: 2500" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Costo Compra ($)</label>
                    <input type="number" placeholder="Ej: 1200" value={newProd.costPrice} onChange={(e) => setNewProd({ ...newProd, costPrice: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Stock Inicial</label>
                    <input type="number" placeholder="Ej: 12" value={newProd.stock} onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Alerta Stock Bajo</label>
                    <input type="number" placeholder="Ej: 5" value={newProd.minStock} onChange={(e) => setNewProd({ ...newProd, minStock: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3.5 rounded-xl text-sm transition cursor-pointer">Guardar Producto</button>
              </form>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2"><History className="w-5 h-5 text-amber-500" /> Historial de Movimientos de Stock</h3>
                <span className="text-xs text-zinc-400">Últimos {stockMovements.length} movimientos</span>
              </div>
              {stockMovements.length === 0 ? (
                <p className="text-sm text-zinc-500">Todavía no hay movimientos registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                        <th className="py-3 px-3">Fecha y Hora</th>
                        <th className="py-3 px-3">Producto</th>
                        <th className="py-3 px-3">Movimiento</th>
                        <th className="py-3 px-3">Cantidad</th>
                        <th className="py-3 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {stockMovements.map((mov) => (
                        <tr key={mov.id} className="hover:bg-zinc-950/50">
                          <td className="py-3 px-3 text-xs text-zinc-400">
                            {new Date(mov.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">{mov.product?.name}</td>
                          <td className="py-3 px-3">
                            {mov.type === 'IN' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full"><ArrowUpRight className="w-3.5 h-3.5" /> Entrada</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full"><ArrowDownLeft className="w-3.5 h-3.5" /> Salida</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-extrabold">{mov.type === 'IN' ? `+${mov.quantity}` : `-${mov.quantity}`}</td>
                          <td className="py-3 px-3 text-zinc-300 text-xs">{mov.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 6: PRECIOS */}
        {activeTab === 'servicios' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-3">
              <h2 className="text-2xl font-extrabold">Cortes y Precios</h2>
              {services.map((srv) => (
                <div key={srv.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{srv.name}</h3>
                    <p className="text-xs text-zinc-400">{srv.description} · {srv.durationMinutes} min</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold text-amber-400 text-lg">{formatPrice(srv.price)}</span>
                    <button onClick={() => handleUpdateServicePrice(srv.id, srv.price)} className="text-sm font-bold bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl transition cursor-pointer">Cambiar Precio</button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleCreateService} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="font-bold text-lg">Nuevo Corte / Servicio</h3>
              <input type="text" placeholder="Nombre (ej: Corte + Barba)" value={newSrv.name} onChange={(e) => setNewSrv({ ...newSrv, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              <input type="text" placeholder="Descripción corta" value={newSrv.description} onChange={(e) => setNewSrv({ ...newSrv, description: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Precio ($)" value={newSrv.price} onChange={(e) => setNewSrv({ ...newSrv, price: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                <input type="number" placeholder="Minutos (30, 45...)" value={newSrv.durationMinutes} onChange={(e) => setNewSrv({ ...newSrv, durationMinutes: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3.5 rounded-xl text-sm transition cursor-pointer">Agregar Servicio</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
