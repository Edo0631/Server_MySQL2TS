import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../conf/dbConnection";

const SERVER_ERROR = { ok: false, message: "Error interno del servidor" };

function parseId(value: unknown): number | null {
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return id > 0 ? id : null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (price > 99999999.99) return null;
  if (Math.round(price * 100) / 100 !== price) return null; 
  return price;
}

function parseProductBody(body: Record<string, unknown>) {
  const { name, price, stock, description, brand, img } = body ?? {};
  const validPrice = parsePrice(price);

  if (typeof name !== "string" || name.trim() === "") return null;
  if (validPrice === null) return null;
  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) return null;
  if (typeof description !== "string" || description.trim() === "") return null;
  if (brand != null && typeof brand !== "string") return null;
  if (img != null && typeof img !== "string") return null;

  return {
    name: name.trim(),
    price: validPrice,
    stock,
    description: description.trim(),
    brand: brand ?? null,
    img: img ?? null,
  };
}

export const getAll = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE active = ?",
      [true]
    );
    res.status(200).json({ ok: true, data: rows });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};

export const getById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ ok: false, message: "El id debe ser un entero positivo" });
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE id = ? AND active = ?",
      [id, true]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }
    res.status(200).json({ ok: true, data: rows[0] });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};

export const create = async (req: Request, res: Response) => {
  const product = parseProductBody(req.body);
  if (!product) {
    return res.status(400).json({ ok: false, message: "Datos inválidos" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO products (name, price, stock, description, brand, img) VALUES (?, ?, ?, ?, ?, ?)",
      [product.name, product.price, product.stock, product.description, product.brand, product.img]
    );
    res.status(201).json({ ok: true, message: "Producto creado", id: result.insertId });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};

export const update = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ ok: false, message: "El id debe ser un entero positivo" });
  }
  const product = parseProductBody(req.body);
  if (!product) {
    return res.status(400).json({ ok: false, message: "Datos inválidos" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? WHERE id = ? AND active = ?",
      [product.name, product.price, product.stock, product.description, product.brand, product.img, id, true]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }
    res.status(200).json({ ok: true, message: "Producto actualizado" });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};

export const remove = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ ok: false, message: "El id debe ser un entero positivo" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET active = ? WHERE id = ? AND active = ?",
      [false, id, true]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }
    res.status(200).json({ ok: true, message: "Producto dado de baja" });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};

export const changePrice = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ ok: false, message: "El id debe ser un entero positivo" });
  }
  const keys = Object.keys(req.body ?? {});
  const price = parsePrice(req.body?.price);
  if (keys.length !== 1 || keys[0] !== "price" || price === null) {
    return res.status(400).json({ ok: false, message: "El cuerpo debe contener solo un price válido (> 0, máx. 2 decimales)" });
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE products SET price = ? WHERE id = ? AND active = ?",
      [price, id, true]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }
    res.status(200).json({ ok: true, message: "Precio actualizado" });
  } catch {
    res.status(500).json(SERVER_ERROR);
  }
};