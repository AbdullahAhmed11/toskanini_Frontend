import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./App.css";
import { deleteTableOrder, getTableOrder, putTableOrder } from "./api/tableOrder";
import { MENU_ITEMS as fallbackMenuItems } from "./data/menu";
import type { MenuCategory, MenuItem, OrderItem } from "./types/order";

const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const TABLES = Array.from({ length: 15 }, (_, index) => index + 1);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(value);

function App() {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | "الكل">(
    "الكل",
  );
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState(() => new Date());
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [tableSwitching, setTableSwitching] = useState(false);
  const [orderSyncError, setOrderSyncError] = useState<string | null>(null);

  const isHydratingRef = useRef(false);
  const printTableRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      try {
        const response = await fetch(`${apiBase}/api/menu`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid menu payload");
        }
        if (!cancelled) {
          setMenuItems(data as MenuItem[]);
        }
      } catch {
        if (!cancelled) {
          setMenuItems(fallbackMenuItems);
        }
      } finally {
        if (!cancelled) {
          setMenuLoading(false);
        }
      }
    }

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    function onAfterPrint() {
      const table = printTableRef.current;
      printTableRef.current = null;
      if (table === null) {
        return;
      }
      void deleteTableOrder(apiBase, table).catch(() => {
        setOrderSyncError("تعذر حذف الطلب من السيرفر بعد الطباعة.");
        setTimeout(() => setOrderSyncError(null), 5000);
      });
      setOrderItems([]);
      setNotes("");
      setDateTime(new Date());
    }

    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [apiBase]);

  useEffect(() => {
    if (selectedTable === null) {
      return;
    }
    if (isHydratingRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (isHydratingRef.current) {
        return;
      }
      if (orderItems.length === 0 && notes.trim() === "") {
        void deleteTableOrder(apiBase, selectedTable).catch(() => {
          setOrderSyncError("تعذر حفظ الطلب على السيرفر.");
          setTimeout(() => setOrderSyncError(null), 5000);
        });
        return;
      }
      void putTableOrder(apiBase, selectedTable, orderItems, notes).catch(() => {
        setOrderSyncError("تعذر حفظ الطلب على السيرفر.");
        setTimeout(() => setOrderSyncError(null), 5000);
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [apiBase, selectedTable, orderItems, notes]);

  const menuCategories = useMemo(
    () => Array.from(new Set(menuItems.map((item) => item.category))),
    [menuItems],
  );

  const filteredMenu = useMemo(() => {
    if (selectedCategory === "الكل") {
      return menuItems;
    }
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const subtotal = useMemo(
    () => orderItems.reduce((sum, orderItem) => sum + orderItem.item.price * orderItem.quantity, 0),
    [orderItems],
  );
  const total = subtotal;

  const handleSelectTable = async (tableNumber: number) => {
    if (tableSwitching) {
      return;
    }
    if (tableNumber === selectedTable) {
      return;
    }

    setTableSwitching(true);
    isHydratingRef.current = true;

    try {
      const previous = selectedTable;
      if (previous !== null) {
        await putTableOrder(apiBase, previous, orderItems, notes);
      }
      const data = await getTableOrder(apiBase, tableNumber);
      setSelectedTable(tableNumber);
      setOrderItems(data.items);
      setNotes(data.notes);
    } catch {
      setOrderSyncError("تعذر تحميل أو حفظ طلب الطاولة. تحقق من أن الباك اند يعمل.");
      setTimeout(() => setOrderSyncError(null), 5000);
    } finally {
      isHydratingRef.current = false;
      setTableSwitching(false);
    }
  };

  const addItemToOrder = (item: MenuItem) => {
    setOrderItems((previous) => {
      const existing = previous.find((orderItem) => orderItem.item.id === item.id);
      if (!existing) {
        return [...previous, { item, quantity: 1 }];
      }

      return previous.map((orderItem) =>
        orderItem.item.id === item.id
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem,
      );
    });
  };

  const changeQuantity = (itemId: string, delta: number) => {
    setOrderItems((previous) =>
      previous
        .map((orderItem) =>
          orderItem.item.id === itemId
            ? { ...orderItem, quantity: Math.max(1, orderItem.quantity + delta) }
            : orderItem,
        )
        .filter((orderItem) => orderItem.quantity > 0),
    );
  };

  const removeItem = (itemId: string) => {
    setOrderItems((previous) =>
      previous.filter((orderItem) => orderItem.item.id !== itemId),
    );
  };

  const canPrint = selectedTable !== null && orderItems.length > 0;

  const printCheck = () => {
    if (!canPrint || selectedTable === null) {
      return;
    }
    flushSync(() => {
      setDateTime(new Date());
    });
    printTableRef.current = selectedTable;
    window.print();
  };

  return (
    <main className="page" dir="rtl">
      <section className="screen-only heading">
        <h1>Toskanini Cafe — لوحة المشرف</h1>
        <p>
          اختر طاولة لعرض طلبها المحفوظ على السيرفر. يمكنك التنقل بين الطاولات؛ يبقى طلب كل طاولة
          حتى طباعة الشيك ثم يُفرغ تلقائياً.
        </p>
      </section>

      {orderSyncError ? (
        <section className="screen-only">
          <p className="muted" role="alert">
            {orderSyncError}
          </p>
        </section>
      ) : null}

      <section className="screen-only grid-two">
        <div className="card">
          <h2>اختيار الطاولة</h2>
          {tableSwitching ? <p className="muted">جاري مزامنة الطاولة…</p> : null}
          <div className="tables-grid">
            {TABLES.map((tableNumber) => (
              <button
                key={tableNumber}
                type="button"
                className={`table-btn ${selectedTable === tableNumber ? "selected" : ""}`}
                disabled={tableSwitching}
                onClick={() => void handleSelectTable(tableNumber)}
              >
                طاولة {tableNumber}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>الأقسام</h2>
          <div className="category-row">
            <button
              type="button"
              className={`category-btn ${selectedCategory === "الكل" ? "active" : ""}`}
              onClick={() => setSelectedCategory("الكل")}
            >
              الكل
            </button>
            {menuCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-btn ${selectedCategory === category ? "active" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="screen-only grid-two">
        <div className="card">
          <h2>المنيو</h2>
          {menuLoading ? (
            <p className="muted">جاري تحميل المنيو…</p>
          ) : null}
          <div className="menu-grid">
            {filteredMenu.map((item) => (
              <article key={item.id} className="menu-item">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.category}</p>
                </div>
                <div className="menu-item-footer">
                  <strong>{formatCurrency(item.price)}</strong>
                  <button type="button" onClick={() => addItemToOrder(item)} disabled={selectedTable === null}>
                    إضافة
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>ملخص الطلب</h2>
          {selectedTable === null ? (
            <p className="muted">اختر طاولة لعرض طلبها أو إضافة أصناف.</p>
          ) : null}
          {orderItems.length === 0 ? (
            <p className="muted">لا يوجد أصناف مضافة حتى الآن.</p>
          ) : (
            <div className="order-list">
              {orderItems.map((orderItem) => (
                <div key={orderItem.item.id} className="order-row">
                  <div>
                    <h3>{orderItem.item.name}</h3>
                    <p>{formatCurrency(orderItem.item.price)} / للقطعة</p>
                  </div>
                  <div className="qty-controls">
                    <button type="button" onClick={() => changeQuantity(orderItem.item.id, 1)}>
                      +
                    </button>
                    <span>{orderItem.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(orderItem.item.id, -1)}
                      disabled={orderItem.quantity <= 1}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeItem(orderItem.item.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <label className="notes-field" htmlFor="notes">
            ملاحظات الطلب
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="مثال: بدون سكر - كوب إضافي..."
              rows={3}
              disabled={selectedTable === null}
            />
          </label>
        </div>
      </section>

      <section className="card receipt receipt-area">
        <header className="receipt-header">
          <h2>Toskanini Cafe</h2>
          <p>شيك الطلب</p>
        </header>

        <div className="receipt-meta">
          <p>
            <strong>الطاولة:</strong> {selectedTable ? selectedTable : "غير محددة"}
          </p>
          <p>
            <strong>التاريخ:</strong>{" "}
            {new Intl.DateTimeFormat("ar-EG", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(dateTime)}
          </p>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted center-cell">
                  لا يوجد أصناف
                </td>
              </tr>
            ) : (
              orderItems.map((orderItem) => (
                <tr key={`receipt-${orderItem.item.id}`}>
                  <td>{orderItem.item.name}</td>
                  <td>{orderItem.quantity}</td>
                  <td>{formatCurrency(orderItem.item.price)}</td>
                  <td>{formatCurrency(orderItem.quantity * orderItem.item.price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {notes.trim() ? (
          <div className="receipt-notes">
            <strong>ملاحظات:</strong>
            <p>{notes}</p>
          </div>
        ) : null}

        <div className="receipt-totals">
          <p>
            <span>المجموع الفرعي</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </p>
          <p className="grand-total">
            <span>الإجمالي</span>
            <strong>{formatCurrency(total)}</strong>
          </p>
        </div>

        <div className="screen-only print-actions">
          <button type="button" onClick={printCheck} disabled={!canPrint}>
            طباعة الشيك
          </button>
          {!selectedTable ? <p className="muted">اختر الطاولة أولاً.</p> : null}
        </div>
      </section>
    </main>
  );
}

export default App;
