const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API_URL = `${BASE_URL}/api/v1`;

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('barber_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error en la solicitud');
  }

  return data;
};

export const isActiveBarber = (barber) =>
  barber?.active === true
  && (barber?.user ? barber.user.active === true : true)
  && String(barber?.displayName || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() !== 'santi';

export const filterActiveBarbers = (barbers) =>
  Array.isArray(barbers) ? barbers.filter(isActiveBarber) : [];

export const filterActiveServices = (services) =>
  Array.isArray(services) ? services.filter((service) => service?.active !== false) : [];
