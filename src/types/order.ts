export type MenuCategory = string;

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
}

export interface OrderItem {
  item: MenuItem;
  quantity: number;
}

/** Response from GET/PUT `/api/tables/:tableNumber/order` */
export interface TableOrderResponse {
  tableNumber: number;
  items: OrderItem[];
  notes: string;
}
