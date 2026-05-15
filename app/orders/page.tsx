"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  activeOrderStatuses,
  formatDate,
  formatMoney,
  normalizePhone,
  orderStatuses,
  type Client,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import { listClients, listOrders, updateOrderStatusRecord } from "@/lib/data";

const statuses: Array<"all" | OrderStatus> = ["all", ...orderStatuses];
type ExportPeriod = "day" | "week" | "month" | "all";

const exportPeriods: Array<{ label: string; value: ExportPeriod }> = [
  { label: "День", value: "day" },
  { label: "Неделя", value: "week" },
  { label: "Месяц", value: "month" },
  { label: "Все", value: "all" },
];

export default function OrdersPage() {
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(
    async () =>
      (await listOrders()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    []
  );
  const clients = clientsState.value;
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const orders = ordersOverride || ordersState.value;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const isLoading = !clientsState.initialized || !ordersState.initialized;

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase().trim();

    return orders.filter((order) => {
      const client = clientMap.get(order.clientId);

      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;

      const matchesSearch =
        !query ||
        order.productName.toLowerCase().includes(query) ||
        order.article.toLowerCase().includes(query) ||
        order.brand.toLowerCase().includes(query) ||
        order.employeeName.toLowerCase().includes(query) ||
        client?.name.toLowerCase().includes(query) ||
        client?.phone.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, clientMap, search, statusFilter]);

  const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);

  function getOrdersForExport(period: ExportPeriod) {
    if (period === "all") {
      return orders;
    }

    const start = new Date();

    if (period === "day") {
      start.setHours(0, 0, 0, 0);
    }

    if (period === "week") {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }

    if (period === "month") {
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    }

    return orders.filter((order) => new Date(order.createdAt) >= start);
  }

  function escapeCsv(value: string | number) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function buildCsv(period: ExportPeriod) {
    const exportOrders = getOrdersForExport(period);
    const employeeStats = exportOrders.reduce(
      (stats, order) => {
        const employee = order.employeeName || "Сотрудник";
        const current = stats.get(employee) || { count: 0, total: 0 };

        stats.set(employee, {
          count: current.count + 1,
          total: current.total + order.total,
        });

        return stats;
      },
      new Map<string, { count: number; total: number }>()
    );

    const rows: string[][] = [
      ["Сводка по сотрудникам"],
      ["Сотрудник", "Заказов", "Сумма"],
      ...Array.from(employeeStats.entries()).map(([employee, stats]) => [
        employee,
        String(stats.count),
        stats.total.toFixed(2),
      ]),
      [],
      ["Продажи"],
      [
        "Дата",
        "Сотрудник",
        "Клиент",
        "Телефон",
        "Товар",
        "Артикул",
        "Бренд",
        "Количество",
        "Цена / шт.",
        "Сумма",
        "Статус",
        "Комментарий",
      ],
      ...exportOrders.map((order) => {
        const client = clientMap.get(order.clientId);

        return [
          new Date(order.createdAt).toLocaleString("ru-RU"),
          order.employeeName,
          client?.name || "",
          client?.phone || "",
          order.productName,
          order.article,
          order.brand,
          String(order.quantity),
          order.price.toFixed(2),
          order.total.toFixed(2),
          order.status,
          order.comment,
        ];
      }),
    ];

    return `sep=;\n${rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(";"))
      .join("\n")}`;
  }

  function handleExport(period: ExportPeriod) {
    const csv = buildCsv(period);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder) {
      return;
    }

    const nextOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: nextStatus,
          }
        : order
    );

    setOrdersOverride(nextOrders);

    try {
      await updateOrderStatusRecord(currentOrder, nextStatus);
    } catch (error) {
      setOrdersOverride(orders);
      alert(
        error instanceof Error
          ? error.message
          : "Не удалось изменить статус заказа."
      );
    }
  }

  if (isLoading) {
    return (
      <CrmShell title="Журнал заказов">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-900">Загрузка заказов...</p>
          <p className="mt-2 text-sm text-slate-500">
            CRM получает продажи и клиентов из базы.
          </p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title="Журнал заказов">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Все заказы</h3>
          <p className="mt-1 text-slate-600">
            Общая история заказов и покупок по всем клиентам.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/orders/new"
            className="inline-flex justify-center rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Добавить заказ
          </Link>

          <Link
            href="/clients"
            className="inline-flex justify-center rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-white"
          >
            Найти клиента
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Найдено заказов</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredOrders.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Сумма по выборке</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(totalSales)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Всего клиентов</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {clients.length}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Поиск
          </label>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Клиент, телефон, товар, артикул, бренд, сотрудник"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Статус
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | OrderStatus)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Все статусы" : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-slate-900">Экспорт продаж</h4>
            <p className="mt-1 text-sm text-slate-500">
              CSV открывается в Excel и содержит продажи и сводку по сотрудникам.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {exportPeriods.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => handleExport(period.value)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            Заказы не найдены.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredOrders.map((order) => {
              const client = clientMap.get(order.clientId);

              return (
                <div key={order.id} className="p-5 hover:bg-slate-50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {order.productName}
                      </Link>

                      <p className="mt-1 text-sm text-slate-600">
                        Артикул: {order.article || "—"} · Бренд:{" "}
                        {order.brand || "—"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Клиент:{" "}
                        {client ? (
                          <Link
                            href={`/clients/${encodeURIComponent(normalizePhone(client.phone))}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {client.name}
                          </Link>
                        ) : (
                          "клиент не найден"
                        )}
                        {client?.phone ? ` · ${client.phone}` : ""}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Кол-во: {order.quantity} · Цена:{" "}
                        {formatMoney(order.price)}
                      </p>

                      {order.comment && (
                        <p className="mt-2 text-sm text-slate-500">
                          {order.comment}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(order.createdAt)} · {order.employeeName}
                      </p>
                    </div>

                    <div className="shrink-0 sm:min-w-36 sm:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatMoney(order.total)}
                      </p>

                      {activeOrderStatuses.includes(order.status) && (
                        <select
                          value={order.status}
                          onChange={(event) =>
                            updateOrderStatus(
                              order.id,
                              event.target.value as OrderStatus
                            )
                          }
                          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900"
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}

                      {!activeOrderStatuses.includes(order.status) && (
                        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                          {order.status}
                        </p>
                      )}

                      <Link
                        href={`/orders/${order.id}`}
                        className="mt-3 inline-flex justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                      >
                        Редактировать
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CrmShell>
  );
}
