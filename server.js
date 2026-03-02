const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = {};
let bets = [];
let chats = [];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/chats', (req, res) => res.json(chats.slice(-50)));

app.post('/api/chat', (req, res) => {
  const msg = req.body;
  chats.push(msg);
  if (chats.length > 100) chats = chats.slice(-100);
  io.emit('chat', msg);
  res.json({ success: true });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ error: 'Username taken' });
  users[username] = { password, balance: 500 };
  res.json({ success: true, balance: 500 });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username]?.password === password) {
    return res.json({ success: true, balance: users[username].balance });
  }
  res.json({ error: 'Invalid credentials' });
});

app.get('/api/users', (req, res) => {
  const list = Object.entries(users).map(([name, d]) => ({ name, balance: d.balance }))
    .sort((a, b) => b.balance - a.balance).slice(0, 10);
  res.json(list);
});

app.get('/api/bets', (req, res) => res.json(bets.slice(-50).reverse()));

app.post('/api/bet', (req, res) => {
  const { username, game, bet, profit } = req.body;
  if (!users[username]) return res.json({ error: 'User not found' });
  users[username].balance += profit;
  bets.push({ user: username, game, bet, profit, time: new Date().toISOString() });
  if (bets.length > 100) bets = bets.slice(-100);
  res.json({ success: true, balance: users[username].balance });
});

app.post('/api/transfer', (req, res) => {
  const { from, to, amount } = req.body;
  if (!users[from] || !users[to]) return res.json({ error: 'User not found' });
  if (users[from].balance < amount) return res.json({ error: 'Insufficient balance' });
  users[from].balance -= amount;
  users[to].balance += amount;
  res.json({ success: true, balance: users[from].balance });
});

io.on('connection', (socket) => {
  socket.on('chat', (msg) => io.emit('chat', msg));
});

server.listen(3000);
