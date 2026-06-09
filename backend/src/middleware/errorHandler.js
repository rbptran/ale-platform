function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (err.code === 'P2002') return res.status(409).json({ error: 'A record with this value already exists.', field: err.meta?.target });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found.' });
  if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status < 500 ? err.message : 'Internal server error' });
}
module.exports = errorHandler;
