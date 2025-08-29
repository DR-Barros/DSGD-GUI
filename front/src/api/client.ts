// src/api/client.js
const URL = import.meta.env.PROD ? '/' : 'http://localhost:8000/';
export const API_URL: string = `${URL}api`;

function redirectToLogin() {
  window.location.href = '/login';
}

export async function fetchProtected(endpoint: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: "include",
  });

  if (res.status === 401) {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "GET",
        credentials: "include",
      });
      if (refreshRes.status === 200) {
        const data = await refreshRes.json();
        localStorage.setItem("jwt", data.access_token);
        // Reintentar la solicitud original
        const retryRes = await fetch(`${API_URL}${endpoint}`, {
          credentials: "include",
        });
        if (retryRes.status === 200) {
          return { data: await retryRes.json(), status: retryRes.status };
        }
        redirectToLogin();
        throw new Error("No autorizado");
      } else {
        redirectToLogin();
        throw new Error("No autorizado");
      }
  }

  return { data: await res.json(), status: res.status };
}

export async function postProtected(endpoint: string, body: any) {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    body: isFormData ? body : JSON.stringify(body),
    credentials: "include", 
  });
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "GET",
      credentials: "include", 
    });
    if (refreshRes.status === 200) {
      // Reintentar la solicitud original
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (retryRes.status === 200) {
        return { data: await retryRes.json(), status: retryRes.status };
      }
    }
    redirectToLogin();
    throw new Error("No autorizado");
  }
  return { data: await res.json(), status: res.status };
}

export async function putProtected(endpoint: string, body: any) {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "GET",
      credentials: "include", // Necesario para enviar la cookie HttpOnly
    });
    if (refreshRes.status === 200) {
      const data = await refreshRes.json();
      localStorage.setItem("jwt", data.access_token);
      // Reintentar la solicitud original
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (retryRes.status === 200) {
        return retryRes.json();
      }
    }
    redirectToLogin();
    throw new Error("No autorizado");
  }
  return res.json();
}

export async function deleteProtected(endpoint: string) {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "GET",
      credentials: "include", // Necesario para enviar la cookie HttpOnly
    });
    if (refreshRes.status === 200) {
      const data = await refreshRes.json();
      localStorage.setItem("jwt", data.access_token);
      // Reintentar la solicitud original
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });
      if (retryRes.status === 200) {
        return retryRes.json();
      }
    }
    redirectToLogin();
    throw new Error("No autorizado");
  }
  return res.json();
}


export async function fetchPublic(endpoint: string) {
  const res = await fetch(`${API_URL}${endpoint}`);

  if (res.status === 401) {
    throw new Error("No autorizado");
  }

  return res.json();
}

export async function postPublic(endpoint: string, body: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error("No autorizado");
  }

  return res.json();
}