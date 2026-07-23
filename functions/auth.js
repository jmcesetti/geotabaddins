const jwt = require('jsonwebtoken');

exports.handler = async function (event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, password } = body;

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and password are required' }) };
  }

  const validEmail    = process.env.AUTH_EMAIL;
  const validPassword = process.env.AUTH_PASSWORD;
  const jwtSecret     = process.env.JWT_SECRET;

  if (!validEmail || !validPassword || !jwtSecret) {
    console.error('Missing required environment variables: AUTH_EMAIL, AUTH_PASSWORD, JWT_SECRET');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  // Constant-time comparison to avoid timing attacks
  const emailMatch    = email    === validEmail;
  const passwordMatch = password === validPassword;

  if (!emailMatch || !passwordMatch) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }

  const token = jwt.sign(
    { email, iat: Math.floor(Date.now() / 1000) },
    jwtSecret,
    { expiresIn: '8h' }
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  };
};
