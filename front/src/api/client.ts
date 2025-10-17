// src/api/client.js
const URL = import.meta.env.PROD ? '/' : 'http://localhost:8000/';
const WS_URL = import.meta.env.PROD ? `wss://${window.location.host}/` : 'ws://localhost:8000/';
export const API_URL: string = `${URL}dsgd/api`;
export const API_WS_URL: string = `${WS_URL}dsgd/api`;

function redirectToLogin() {
  const basename = import.meta.env.MODE === 'production' ? '/dsgd/' : '/'
  window.location.href = `${basename}login`;
}

export async function fetchProtected(endpoint: string) {
  try {
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
  } catch (error) {
    console.error("Error en fetchProtected:", error);
    throw error;
  }
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
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "GET",
      credentials: "include", // Necesario para enviar la cookie HttpOnly
    });
    if (refreshRes.status === 200) {
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (retryRes.status === 200) {
        return retryRes.json();
      }
    }
    redirectToLogin();
    throw new Error("No autorizado");
  }
  else if (!res.ok) {
    throw new Error(`Error en la solicitud: ${res.statusText}`);
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


export async function downloadProtected(endpoint: string, filename: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
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

      // Reintentar la descarga
      const retryRes = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
      });
      if (retryRes.status === 200) {
        const blob = await retryRes.blob();
        triggerDownload(blob, filename);
        return;
      }
    }
    redirectToLogin();
    throw new Error("No autorizado");
  }

  if (res.ok) {
    const blob = await res.blob();
    triggerDownload(blob, filename);
  } else {
    throw new Error("Error descargando archivo");
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}