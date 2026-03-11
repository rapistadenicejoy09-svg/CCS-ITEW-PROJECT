const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || 'Request failed'
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function apiRegister({ role, identifier, password, fullName, enable2FA }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ role, identifier, password, fullName, enable2FA }),
  })
}

export async function apiLogin({ identifier, password, twoFACode }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, twoFACode }),
  })
}

export async function apiLogout(token) {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function apiMe(token) {
  return request('/api/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}

