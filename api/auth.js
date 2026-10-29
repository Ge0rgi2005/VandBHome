const auth = require('../lib/auth');

// GET    /api/auth  -> { admin: true|false }
// POST   /api/auth  -> вход с { password }
// DELETE /api/auth  -> изход
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ admin: auth.isAdmin(req) });

  if (req.method === 'POST') {
    if (!auth.configured()) return res.status(500).json({ error: 'Не е зададена ADMIN_PASSWORD във Vercel.' });
    const password = req.body && req.body.password;
    if (!auth.passwordOk(password)) {
      await new Promise((r) => setTimeout(r, 700)); // забавяне срещу налучкване
      return res.status(401).json({ error: 'Грешна парола.' });
    }
    auth.login(res);
    return res.status(200).json({ admin: true });
  }

  if (req.method === 'DELETE') {
    auth.logout(res);
    return res.status(200).json({ admin: false });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Методът не е позволен.' });
};
