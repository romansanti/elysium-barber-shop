const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'peluqueria_secreto_super_seguro_2026';

const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Ingresá tu usuario y contraseña.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
      include: { role: true, barber: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role.name,
        barberId: user.barber ? user.barber.id : null,
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role.name,
        barberId: user.barber ? user.barber.id : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
};

module.exports = { login };