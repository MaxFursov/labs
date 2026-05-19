const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

function readUsers() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    console.error('Помилка читання users.json:', error);
    return [];
  }
}

function writeUsers(users) {
  ensureDataFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function seedUsers() {
  const users = readUsers();
  if (users.length > 0) return;
  const seed = [
    { name: 'Оператор мережі', email: 'operator@grid.local', password: 'Operator123!', role: 'operator' },
    { name: 'Аналітик мережі', email: 'analyst@grid.local', password: 'Analyst123!', role: 'analyst' },
    { name: 'Адміністратор системи', email: 'admin@grid.local', password: 'Admin123!', role: 'administrator' }
  ];
  const prepared = [];
  for (const user of seed) {
    prepared.push({
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      name: user.name,
      email: user.email,
      passwordHash: await bcrypt.hash(user.password, 10),
      role: user.role,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastPasswordChange: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }
  writeUsers(prepared);
}

function findByEmail(email) {
  return readUsers().find(u => u.email === email);
}

function findById(id) {
  return readUsers().find(u => u.id === id);
}

function createUser({ name, email, passwordHash, role }) {
  const users = readUsers();
  const user = {
    id: Date.now().toString(),
    name,
    email,
    passwordHash,
    role,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastPasswordChange: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return user;
}

function updateUser(id, patch) {
  const users = readUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...patch };
  writeUsers(users);
  return users[index];
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    lastPasswordChange: user.lastPasswordChange
  };
}

module.exports = { readUsers, writeUsers, seedUsers, findByEmail, findById, createUser, updateUser, publicUser };
