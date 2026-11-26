import { useState, useEffect } from 'react';
import {
  Scissors, Calendar, Clock, MapPin, Phone, CheckCircle2,
  XCircle, User, ExternalLink, LogIn
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function ClientLanding({ onOpenAdmin, onGoAdmin }) {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // Wizard de reserva
  const [wizardStep, setWizardStep] = useState(1);
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
        const barberIds = selectedBarberId === 'ANY'
          ? barbers.map((barber) => barber.id)
          : [selectedBarberId];

        const responses = await Promise.allSettled(barberIds.map((barberId) =>
          apiRequest(`/appointments/availability?barberId=${barberId}&serviceId=${selectedServiceId}&date=${appointmentDate}`)
        ));

        const union = new Set();
        responses.forEach((response) => {
          if (response.status === 'fulfilled') {
            const slots = Array.isArray(response.value)
              ? response.value
              : (response.value.slots || response.value.availableSlots || []);
            slots.forEach((slot) => union.add(typeof slot === 'string' ? slot : slot.startTime));
          }
        });
        setAvailableSlots([...union].sort());
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedBarberId, selectedServiceId, appointmentDate, barbers]);

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
          barberId: selectedBarberId === 'ANY' ? 'ANY' : Number(selectedBarberId),
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

  const next14Days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });

  const toLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const dayName = (date) => ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][date.getDay()];

  const canAdvance = () => {
    if (wizardStep === 1) return Boolean(selectedBarberId);
    if (wizardStep === 2) return Boolean(selectedServiceId);
    if (wizardStep === 3) return Boolean(appointmentDate && selectedTime);
    return Boolean(firstName.trim() && lastName.trim() && whatsapp.trim());
  };

  const openPanel = () => (onOpenAdmin || onGoAdmin)?.();

  const getServiceImage = (serviceName) => {
    const name = String(serviceName || '').toLowerCase();
    if (name.includes('barba')) {
      return 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('niño') || name.includes('nino')) {
      return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80';
  };

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
              {confirmedBooking.cancelCode || confirmedBooking.cancellationCode ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs">
                  <span className="text-zinc-400 block mb-1">Guardá este código por si necesitás cancelar:</span>
                  <code className="text-amber-400 font-mono font-bold text-sm select-all">{confirmedBooking.cancelCode || confirmedBooking.cancellationCode}</code>
                </div>
              ) : null}
              <button
                onClick={() => setConfirmedBooking(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Sacar otro turno
              </button>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-6">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    type="button"
                    key={step}
                    onClick={() => step < wizardStep && setWizardStep(step)}
                    className="text-left cursor-pointer"
                  >
                    <div className={`h-1.5 rounded-full ${step <= wizardStep ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                    <span className={`text-[11px] mt-2 block ${step <= wizardStep ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                      Paso {step}
                    </span>
                  </button>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold">Elegí tu Barbero</h3>
                    <p className="text-xs text-zinc-400 mt-1">Seleccioná un profesional o el turno más próximo disponible.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {barbers.map((barber) => (
                      <button
                        type="button"
                        key={barber.id}
                        onClick={() => setSelectedBarberId(String(barber.id))}
                        className={`min-h-32 rounded-2xl border p-5 text-left transition cursor-pointer ${String(selectedBarberId) === String(barber.id) ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-amber-500/50'}`}
                      >
                        <User className="w-7 h-7 mb-4" />
                        <span className="block font-extrabold text-lg">{barber.displayName}</span>
                        <span className={`text-xs ${String(selectedBarberId) === String(barber.id) ? 'text-zinc-800' : 'text-zinc-400'}`}>Barbero profesional</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedBarberId('ANY')}
                      className={`min-h-32 rounded-2xl border p-5 text-left transition cursor-pointer ${selectedBarberId === 'ANY' ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-950 border-amber-500/30 hover:border-amber-500/70'}`}
                    >
                      <Clock className="w-7 h-7 mb-4" />
                      <span className="block font-extrabold text-lg">Cualquier barbero</span>
                      <span className={`text-xs ${selectedBarberId === 'ANY' ? 'text-zinc-800' : 'text-zinc-400'}`}>Turno más próximo disponible</span>
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold">Elegí el Servicio</h3>
                    <p className="text-xs text-zinc-400 mt-1">Seleccioná el servicio que necesitás.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => setSelectedServiceId(String(service.id))}
                        className={`overflow-hidden rounded-2xl border text-left transition cursor-pointer ${String(selectedServiceId) === String(service.id) ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}
                      >
                        <img
                          src={service.imageUrl || getServiceImage(service.name)}
                          alt={service.name}
                          className="h-32 w-full object-cover object-top opacity-90"
                          onError={(event) => { event.currentTarget.src = getServiceImage(service.name); }}
                        />
                        <div className="p-4 flex items-start justify-between gap-3">
                          <div>
                            <span className="font-extrabold block">{service.name}</span>
                            <span className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><Clock className="w-3.5 h-3.5" /> {service.durationMinutes} min</span>
                          </div>
                          <span className="text-amber-400 font-extrabold">{formatPrice(service.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-extrabold">Elegí el Horario</h3>
                    <p className="text-xs text-zinc-400 mt-1">Seleccioná un día y luego una hora disponible.</p>
                  </div>

                  {selectedBarberId !== 'ANY' && (
                    <div className="bg-sky-500/10 border border-sky-500/25 text-sky-200 text-xs rounded-xl px-4 py-3">
                      Atención: estos horarios son los de <strong>{barbers.find((b) => String(b.id) === String(selectedBarberId))?.displayName}</strong>. Si buscás el turno más próximo posible, te recomendamos elegir “Cualquier barbero”.
                    </div>
                  )}

                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      {next14Days.map((date) => {
                        const dateValue = toLocalDate(date);
                        const sunday = date.getDay() === 0;
                        const selected = appointmentDate === dateValue;
                        return (
                          <button
                            type="button"
                            key={dateValue}
                            disabled={sunday}
                            onClick={() => setAppointmentDate(dateValue)}
                            className={`w-16 rounded-xl border py-3 text-center transition ${sunday ? 'opacity-35 cursor-not-allowed border-zinc-900' : 'cursor-pointer'} ${selected ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-amber-500/50'}`}
                          >
                            <span className="block text-[10px] font-bold">{dayName(date)}</span>
                            <span className="block text-lg font-extrabold">{date.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loadingSlots ? (
                    <p className="text-sm text-zinc-400 py-4">Buscando horarios libres...</p>
                  ) : !appointmentDate || new Date(`${appointmentDate}T12:00:00`).getDay() === 0 ? (
                    <p className="text-sm text-amber-400 py-4">Los domingos el local permanece cerrado.</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-amber-400 py-4">No hay turnos libres para esa fecha.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${selectedTime === slot ? 'bg-amber-500 text-zinc-950 border-amber-500' : 'bg-zinc-950 text-zinc-200 border-zinc-800 hover:border-amber-500/50'}`}
                        >
                          {slot} hs
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-5">
                  <h3 className="text-xl font-extrabold">Tus Datos y Confirmación</h3>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="block text-xs text-zinc-500">Barbero</span><strong>{selectedBarberId === 'ANY' ? 'Cualquier barbero' : barbers.find((b) => String(b.id) === String(selectedBarberId))?.displayName}</strong></div>
                    <div><span className="block text-xs text-zinc-500">Servicio</span><strong>{services.find((s) => String(s.id) === String(selectedServiceId))?.name}</strong></div>
                    <div><span className="block text-xs text-zinc-500">Fecha</span><strong>{appointmentDate}</strong></div>
                    <div><span className="block text-xs text-zinc-500">Horario</span><strong>{selectedTime} hs</strong></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Tu Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                    <input type="text" placeholder="Tu Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                    <input type="tel" placeholder="WhatsApp (ej: 3816123456)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="sm:col-span-2 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" required />
                    <textarea placeholder="Nota opcional (ej: corte degradé bajo, barba perfilada...)" value={notes} onChange={(e) => setNotes(e.target.value)} className="sm:col-span-2 min-h-24 resize-y bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm" />
                  </div>
                  {bookingError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">{bookingError}</div>}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button type="button" onClick={() => setWizardStep((step) => Math.max(1, step - 1))} disabled={wizardStep === 1} className="px-5 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-bold text-sm disabled:opacity-40 cursor-pointer">← Volver</button>
                {wizardStep < 4 ? (
                  <button type="button" onClick={() => canAdvance() && setWizardStep((step) => step + 1)} disabled={!canAdvance()} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-sm disabled:opacity-40 cursor-pointer">Siguiente →</button>
                ) : (
                  <button type="submit" disabled={bookingLoading || !canAdvance()} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-sm disabled:opacity-40 cursor-pointer">{bookingLoading ? 'Confirmando...' : 'Confirmar Turno'}</button>
                )}
              </div>
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
