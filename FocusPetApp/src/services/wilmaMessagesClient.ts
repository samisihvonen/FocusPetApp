// Stubbed Wilma messages client. Original implementation archived to /archive/.
// For MVP we return empty arrays and avoid login/HTTP logic.

export interface WilmaMessage {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
}

export async function fetchWilmaMessages(
  _url: string,
  _username: string,
  _password: string,
): Promise<WilmaMessage[]> {
  // MVP: do not perform real network auth — return empty list.
  return [];
}
