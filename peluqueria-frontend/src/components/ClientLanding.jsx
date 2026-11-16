import { useState, useEffect } from 'react';
import {
  Scissors, Calendar, Clock, MapPin, Phone, CheckCircle2,
  XCircle, User, ExternalLink, LogIn
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function ClientLanding({ onOpenAdmin, onGoAdmin }) {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // Formulario de reserva
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Cancelación de turno
  const [cancelCode, setCancelCode] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [srvs, brbs] = await Promise.all([
          apiRequest('/services'),
          apiRequest('/barbers'),
        ]);
        setServices(srvs);
        setBarbers(brbs);
        if (srvs.length > 0) setSelectedServiceId(String(srvs[0].id));
        if (brbs.length > 0) setSelectedBarberId(String(brbs[0].id));
      } catch (err) {
        console.error('Error cargando servicios/barberos:', err);
      }
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedBarberId || !selectedServiceId || !appointmentDate) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedTime('');
      try {
        const res = await apiRequest(
          `/appointments/availability?barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${appointmentDate}`
        );
        const slots = Array.isArray(res) ? res : (res.slots || res.availableSlots || []);
        setAvailableSlots(slots);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedBarberId, selectedServiceId, appointmentDate]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedTime) {
      setBookingError('Elegí un horario disponible antes de confirmar.');
      return;
    }
    setBookingError('');
    setBookingLoading(true);
    try {
      const data = await apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          barberId: Number(selectedBarberId),
          serviceId: Number(selectedServiceId),
          appointmentDate,
          startTime: selectedTime,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          whatsapp: whatsapp.trim(),
          notes: notes.trim(),
        }),
      });
      setConfirmedBooking(data.appointment || data);
      setFirstName('');
      setLastName('');
      setWhatsapp('');
      setNotes('');
      setSelectedTime('');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelCode.trim()) return;
    setCancelLoading(true);
    setCancelFeedback(null);
    try {
      await apiRequest(`/appointments/cancel/${cancelCode.trim()}`, { method: 'PATCH' });
      setCancelFeedback({ ok: true, text: 'Tu turno fue cancelado y el horario quedó liberado.' });
      setCancelCode('');
    } catch (err) {
      setCancelFeedback({ ok: false, text: err.message });
    } finally {
      setCancelLoading(false);
    }
  };

  const formatPrice = (val) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const openPanel = () => (onOpenAdmin || onGoAdmin)?.();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Elysium Barber Shop"
              className="h-11 w-11 object-contain rounded-xl bg-black p-1 border border-amber-500/40"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div>
              <span className="font-extrabold text-base md:text-lg tracking-wider text-white block leading-none">
                ELYSIUM <span className="text-amber-500">BARBER SHOP</span>
              </span>
              <span className="text-[11px] text-zinc-400">San Miguel de Tucumán</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <a href="#servicios" className="hover:text-amber-400 transition">Servicios</a>
            <a href="#reservar" className="hover:text-amber-400 transition">Sacar Turno</a>
            <a href="#ubicacion" className="hover:text-amber-400 transition">Ubicación</a>
            <a href="#cancelar" className="hover:text-amber-400 transition">Cancelar Turno</a>
          </nav>

          <button
            onClick={openPanel}
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 text-xs md:text-sm font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" /> Panel Peluquero
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 text-center space-y-4">
        <span className="inline-block text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
          Av. Juan B. Justo 2219 · San Miguel de Tucumán
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Cortes de precisión, estilo y atención personalizada
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm md:text-base">
          Elegí tu barbero, reservá tu horario online en segundos y evitá esperas en el local.
        </p>
        <div className="pt-2">
          <a
            href="#reservar"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold px-7 py-3.5 rounded-2xl transition text-sm md:text-base"
          >
            <Calendar className="w-5 h-5" /> Reservar mi Turno
          </a>
        </div>
      </section>

      <section id="servicios" className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-2.5">
          <Scissors className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-extrabold">Nuestros Servicios</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => (
            <div
              key={srv.id}
              onClick={() => setSelectedServiceId(String(srv.id))}
              className={`bg-zinc-900 border rounded-2xl p-5 cursor-pointer transition ${
                String(selectedServiceId) === String(srv.id) ? 'border-amber-500' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-lg">{srv.name}</h3>
                <span className="font-extrabold text-amber-400 text-lg">{formatPrice(srv.price)}</span>
              </div>
              {srv.description && <p className="text-xs text-zinc-400 mt-1.5">{srv.description}</p>}
              <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Duración aprox: {srv.durationMinutes} min
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="reservar" className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold">Sacar Turno Online</h2>
            <p className="text-xs text-zinc-400 mt-1">Completá los pasos para confirmar tu lugar en Elysium Barber Shop.</p>
          </div>

          {confirmedBooking ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400 font-extrabold text-lg">
                <CheckCircle2 className="w-6 h-6" /> ¡Turno Confirmado!
              </div>
              <p className="text-sm text-zinc-200">
                Te esperamos el <strong>{confirmedBooking.appointmentDate?.split('T')[0]}</strong> a las{' '}
                <strong>{confirmedBooking.startTime} hs</strong> en <strong>Av. Juan B. Justo 2219</strong>.
              </p>
              {confirmedBooking.cancelCode && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs">
                  <span className="text-zinc-400 block mb-1">Guardá este código por si necesitás cancelar:</span>
                  <code className="text-amber-400 font-mono font-bold text-sm select-all">{confirmedBooking.cancelCode}</code>
                </div>
              )}
              <button
                onClick={() => setConfirmedBooking(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Sacar otro turno
              </button>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">1. Elegí tu Barbero</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {barbers.map((b) => (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => setSelectedBarberId(String(b.id))}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          String(selectedBarberId) === String(b.id)
                            ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold'
                            : 'bg-zinc-950 text-zinc-200 border-zinc-800 hover:border-amber-500/50'
                        }`}
                      >
                        <User className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-extrabold">{b.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">2. Elegí el Servicio</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3.5 text-sm"
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatPrice(s.price)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">3. Fecha</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">4. Horarios Disponibles</label>
                  {loadingSlots ? (
                    <p className="text-xs text-zinc-400 py-3">Buscando horarios libres...</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs text-amber-400 py-3">No hay turnos libres para esa fecha (recordá que domingos está cerrado).</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((slot) => {
                        const timeStr = typeof slot === 'string' ? slot : slot.startTime;
                        return (
                          <button
                            type="button"
                            key={timeStr}
                            onClick={() => setSelectedTime(timeStr)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              selectedTime === timeStr
                                ? 'bg-amber-500 text-zinc-950 border-amber-500'
                                : 'bg-zinc-950 text-zinc-200 border-zinc-800 hover:border-amber-500/50'
                            }`}
                          >
                            {timeStr} hs
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Tu Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Tu Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm"
                  required
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (ej: 3816123456)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm"
                  required
                />
              </div>

              <input
                type="text"
                placeholder="Nota opcional (ej: corte degradé bajo, barba perfilada...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm"
              />

              {bookingError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
                  {bookingError}
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold py-3.5 rounded-2xl transition cursor-pointer text-base"
              >
                {bookingLoading ? 'Confirmando...' : 'Confirmar Turno'}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-zinc-900 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div id="ubicacion" className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-extrabold">Dónde Estamos</h2>
          </div>
          <p className="text-sm text-zinc-400">
            San Miguel de Tucumán, Tucumán — Atención con turno previo para evitar demoras.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-white">Av. Juan B. Justo 2219</p>
                <p className="text-xs text-zinc-400">San Miguel de Tucumán, Tucumán</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
              <div className="space-y-0.5 text-zinc-200">
                <p><strong>Lunes a Viernes:</strong> 10:00 a 13:00 hs y 17:00 a 21:00 hs</p>
                <p><strong>Sábados:</strong> 10:00 a 20:00 hs (de corrido)</p>
                <p className="text-zinc-400"><strong>Domingos:</strong> Cerrado</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">WhatsApp Directo</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://wa.me/5493816971771"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    Marcos Mayo: +54 9 381 697-1771 <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://wa.me/5493816651902"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    Gonzalo Batalla: +54 9 381 665-1902 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
            <iframe
              title="Ubicación Elysium Barber Shop"
              src="https://maps.google.com/maps?q=Av.%20Juan%20B.%20Justo%202219,%20San%20Miguel%20de%20Tucuman&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-56 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href="https://www.google.com/maps/search/?api=1&query=Av.+Juan+B.+Justo+2219,+San+Miguel+de+Tucumán"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-amber-400 hover:bg-zinc-800/70 transition"
            >
              Abrir en Google Maps <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div id="cancelar" className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-extrabold">¿Necesitás Cancelar tu Turno?</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Ingresá el código que te dimos al confirmar tu reserva para liberar el horario automáticamente.
          </p>

          <form onSubmit={handleCancelBooking} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <input
              type="text"
              placeholder="Pegá tu código (ej: a7e0c99568b863a6)"
              value={cancelCode}
              onChange={(e) => setCancelCode(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm font-mono"
              required
            />
            {cancelFeedback && (
              <p className={`text-xs p-3 rounded-xl ${cancelFeedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {cancelFeedback.text}
              </p>
            )}
            <button
              type="submit"
              disabled={cancelLoading}
              className="w-full bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 font-bold py-3.5 rounded-xl text-sm transition cursor-pointer"
            >
              {cancelLoading ? 'Cancelando...' : 'Cancelar mi Reserva'}
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Elysium Barber Shop · Av. Juan B. Justo 2219, San Miguel de Tucumán
      </footer>
    </div>
  );
}
