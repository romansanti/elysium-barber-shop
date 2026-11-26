const SERVICE_DEFAULTS = [
  {
    key: 'corte clasico',
    name: 'Corte Clásico',
    description: 'Corte tradicional a tijera o máquina',
    price: 6000,
    durationMinutes: 30,
    imageUrl: '/corte-clasico.jpeg',
  },
  {
    key: 'corte + barba',
    name: 'Corte + Barba',
    description: 'Corte con perfilado de barba',
    price: 8000,
    durationMinutes: 45,
    imageUrl: '/corte-barba.png',
  },
  {
    key: 'corte nino',
    name: 'Corte niño',
    description: 'Corte infantil',
    price: 5000,
    durationMinutes: 30,
    imageUrl: '/corte-nino.png',
  },
];

const LEGACY_SERVICE_IMAGES = [
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1647140655214-e4a2d914971f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1703792685152-d13e206924d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600603405959-6d623e92445c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1630827020718-3433092696e7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1706307121034-81829ec35a0d?auto=format&fit=crop&w=800&q=80',
];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const findServiceConfig = (serviceName) => {
  const normalized = normalizeText(serviceName);
  return SERVICE_DEFAULTS.find((entry) => entry.key === normalized) || null;
};

/**
 * Updates existing default services' imageUrl when missing, legacy, or forced.
 */
const syncServiceImages = async (prisma, { force = false, createMissing = false } = {}) => {
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  const updatedServices = [];
  const createdServices = [];

  for (const config of SERVICE_DEFAULTS) {
    const existing = services.find((service) => normalizeText(service.name) === config.key);
    if (existing) {
      const currentUrl = String(existing.imageUrl || '').trim();
      const isCorrectLocalImage = currentUrl === config.imageUrl;
      const shouldUpdate = force || !isCorrectLocalImage || !existing.active;
      if (shouldUpdate) {
        const updated = await prisma.service.update({
          where: { id: existing.id },
          data: {
            name: config.name,
            description: config.description,
            price: config.price,
            durationMinutes: config.durationMinutes,
            imageUrl: config.imageUrl,
            active: true,
          },
        });
        updatedServices.push({ id: updated.id, name: updated.name, imageUrl: updated.imageUrl });
      }
    } else if (createMissing) {
      const created = await prisma.service.create({
        data: {
          name: config.name,
          description: config.description,
          price: config.price,
          durationMinutes: config.durationMinutes,
          imageUrl: config.imageUrl,
        },
      });
      createdServices.push({ id: created.id, name: created.name, imageUrl: created.imageUrl });
    }
  }

  return { updatedServices, createdServices };
};

/**
 * Ensures legacy inactive barber accounts such as "Santi" remain deactivated.
 */
const deactivateLegacyBarbers = async (prisma) => {
  const barbers = await prisma.barber.findMany({
    include: { user: { select: { id: true, name: true, active: true } } },
  });

  const deactivatedBarbers = [];
  for (const barber of barbers) {
    const displayName = normalizeText(barber.displayName);
    const userName = normalizeText(barber.user?.name);
    if ((displayName === 'santi' || userName === 'santi') && (barber.active || barber.user?.active)) {
      await prisma.$transaction([
        prisma.barber.update({ where: { id: barber.id }, data: { active: false } }),
        prisma.user.update({ where: { id: barber.userId }, data: { active: false } }),
      ], { maxWait: 10000, timeout: 20000 });
      deactivatedBarbers.push({ id: barber.id, displayName: barber.displayName });
    }
  }

  return deactivatedBarbers;
};

/**
 * Desactiva variantes antiguas de los servicios principales para evitar servicios duplicados en el frontend.
 */
const deactivateLegacyServiceVariants = async (prisma) => {
  const services = await prisma.service.findMany();
  const canonicalNames = new Set(SERVICE_DEFAULTS.map((config) => config.key));
  for (const service of services) {
    const normalized = normalizeText(service.name);
    const isCanonical = canonicalNames.has(normalized);
    const isLegacyVariant = normalized.includes('corte') && (
      normalized.includes('barba') || normalized.includes('nino') || normalized.includes('niño')
    );
    if (!isCanonical && isLegacyVariant && service.active) {
      await prisma.service.update({ where: { id: service.id }, data: { active: false } });
    }
  }
};

/**
 * Synchronizes default service images, legacy barber status, and deactivates legacy service variants idempotently.
 */
const syncCatalogDefaults = async (prisma, options = {}) => {
  const serviceResult = await syncServiceImages(prisma, options);
  const deactivatedBarbers = await deactivateLegacyBarbers(prisma);
  await deactivateLegacyServiceVariants(prisma);
  return { ...serviceResult, deactivatedBarbers };
};

module.exports = {
  SERVICE_DEFAULTS,
  LEGACY_SERVICE_IMAGES,
  findServiceConfig,
  syncServiceImages,
  deactivateLegacyBarbers,
  deactivateLegacyServiceVariants,
  syncCatalogDefaults,
};
