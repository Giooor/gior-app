import bcrypt from 'bcryptjs'
import { getSetting, setSetting } from './db'

const MASTER_PASSWORD_KEY = 'master_password_hash'
const SECURITY_QUESTION_KEY = 'security_question'
const SECURITY_ANSWER_HASH_KEY = 'security_answer_hash'
const SALT_ROUNDS = 12

export function hasMasterPassword(): boolean {
  return Boolean(getSetting(MASTER_PASSWORD_KEY))
}

export function setMasterPassword(password: string): void {
  const hash = bcrypt.hashSync(password, SALT_ROUNDS)
  setSetting(MASTER_PASSWORD_KEY, hash)
}

export function verifyMasterPassword(password: string): boolean {
  const hash = getSetting(MASTER_PASSWORD_KEY)
  if (!hash) return false
  return bcrypt.compareSync(password, hash)
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase()
}

export function hasSecurityQuestion(): boolean {
  return Boolean(getSetting(SECURITY_ANSWER_HASH_KEY))
}

export function getSecurityQuestion(): string | null {
  return getSetting(SECURITY_QUESTION_KEY) ?? null
}

export function setSecurityQuestion(question: string, answer: string): void {
  setSetting(SECURITY_QUESTION_KEY, question)
  setSetting(SECURITY_ANSWER_HASH_KEY, bcrypt.hashSync(normalizeAnswer(answer), SALT_ROUNDS))
}

export function verifySecurityAnswer(answer: string): boolean {
  const hash = getSetting(SECURITY_ANSWER_HASH_KEY)
  if (!hash) return false
  return bcrypt.compareSync(normalizeAnswer(answer), hash)
}

export function resetPasswordWithSecurityAnswer(answer: string, newPassword: string): boolean {
  if (!verifySecurityAnswer(answer)) return false
  setMasterPassword(newPassword)
  return true
}
