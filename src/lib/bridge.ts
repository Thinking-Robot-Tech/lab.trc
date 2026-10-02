export type BridgePort = { device: string; description: string };
export async function bridgeRequest<T>(
  token: string,
  path: string,
  body?: object,
  timeout = 10000,
): Promise<T> {
  try {
    const response = await fetch(`http://127.0.0.1:8765${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Helper returned ${response.status}`);
    return data;
  } catch (e) {
    if (e instanceof TypeError)
      throw new Error(
        'Cannot reach the local helper. Start companion/bridge.py, allow local network access in your browser, and use the token it prints.',
      );
    throw e;
  }
}
