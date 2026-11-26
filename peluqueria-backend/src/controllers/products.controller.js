const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const transactionOptions = { maxWait: 10000, timeout: 20000 };

// Obtener productos activos y últimos movimientos de stock
const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
};

const getStockMovements = async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: true },
    });
    res.json(movements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los movimientos de stock' });
  }
};

// Crear un producto nuevo
const createProduct = async (req, res) => {
  try {
    const { name, categoryName, price, costPrice, stock, minStock, itemGroup, commissionRate } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
    }

    // Buscar o crear la categoría automáticamente
    const catName = (categoryName || 'General').trim();
    let category = await prisma.productCategory.findFirst({
      where: { name: catName }
    });
    if (!category) {
      category = await prisma.productCategory.create({ data: { name: catName } });
    }

    const initialStock = parseInt(stock) || 0;

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name,
        price: Number(price),
        costPrice: Number(costPrice) || 0,
        stock: initialStock,
        minStock: parseInt(minStock) || 5,
        itemGroup: itemGroup === 'PRODUCT' ? 'PRODUCT' : 'BEVERAGE',
        commissionRate: Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : 0,
        ...(initialStock > 0 && {
          stockMovements: {
            create: {
              type: 'IN',
              quantity: initialStock,
              reason: 'Stock inicial'
            }
          }
        })
      },
      include: { category: true }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
};

// Sumar (IN) o quitar (OUT) stock manualmente
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, reason } = req.body;
    const qty = parseInt(quantity);

    if (!['IN', 'OUT'].includes(type) || !qty || qty <= 0) {
      return res.status(400).json({ error: 'Tipo (IN/OUT) o cantidad inválida.' });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: parseInt(id) } });
      if (!product) throw new Error('Producto no encontrado.');

      if (type === 'OUT' && product.stock < qty) {
        throw new Error(`No podés quitar ${qty} unidades. Stock actual: ${product.stock}.`);
      }

      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: type === 'IN' ? { increment: qty } : { decrement: qty }
        },
        include: { category: true }
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type,
          quantity: qty,
          reason: reason || (type === 'IN' ? 'Reposición de mercadería' : 'Baja manual / Consumo')
        }
      });

      return updated;
    }, transactionOptions);

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Error al actualizar el stock.' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, price, costPrice, minStock, stock, itemGroup, commissionRate } = req.body;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(minStock !== undefined ? { minStock: Number(minStock) } : {}),
        ...(stock !== undefined ? { stock: Number(stock) } : {}),
        ...(itemGroup !== undefined && ['PRODUCT', 'BEVERAGE'].includes(String(itemGroup).toUpperCase())
          ? { itemGroup: String(itemGroup).toUpperCase() } : {}),
        ...(commissionRate !== undefined ? { commissionRate: Number(commissionRate) } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'No se pudo actualizar el producto' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ], transactionOptions);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(400).json({
        message: 'No se puede borrar porque ya tiene ventas cobradas. Usá Editar para cambiarle el nombre o el precio.',
      });
    }
    res.status(400).json({ message: err.message || 'No se pudo eliminar el producto' });
  }
};

module.exports = {
  getProducts,
  getStockMovements,
  createProduct,
  adjustStock,
  updateProduct,
  deleteProduct,
};