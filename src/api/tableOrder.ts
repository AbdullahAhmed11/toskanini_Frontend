import type { OrderItem, TableOrderResponse } from "../types/order";

export async function getTableOrder(
  apiBase: string,
  tableNumber: number,
): Promise<TableOrderResponse> {
  const response = await fetch(`${apiBase}/api/tables/${tableNumber}/order`);
  if (!response.ok) {
    throw new Error(`GET order failed: ${response.status}`);
  }
  return response.json() as Promise<TableOrderResponse>;
}

export async function putTableOrder(
  apiBase: string,
  tableNumber: number,
  items: OrderItem[],
  notes: string,
): Promise<TableOrderResponse> {
  const response = await fetch(`${apiBase}/api/tables/${tableNumber}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, notes }),
  });
  if (!response.ok) {
    throw new Error(`PUT order failed: ${response.status}`);
  }
  return response.json() as Promise<TableOrderResponse>;
}

export async function deleteTableOrder(apiBase: string, tableNumber: number): Promise<void> {
  const response = await fetch(`${apiBase}/api/tables/${tableNumber}/order`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`DELETE order failed: ${response.status}`);
  }
}
