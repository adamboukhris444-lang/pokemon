import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'fallback_secret'
const SALT_ROUNDS = 10

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Non authentifié.' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' })
  }
}
