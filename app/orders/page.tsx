"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  formatDate,
  formatMoney,
  orderStatuses,
  type Client,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import { listClients, listOrders } from "@/lib/data";

const statuses: Array<"all" | OrderStatus> = ["all", ...orderStatuses];

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
  const orders = ordersState.value;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

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

  return (
    <CrmShell title="Журнал заказов">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Все заказы</h3>
          <p className="mt-1 text-slate-600">
            Общая история заказов и покупок по всем клиентам.
          </p>
        </div>

        <Link
          href="/clients"
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
        >
          Найти клиента
        </Link>
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
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {order.productName}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Артикул: {order.article || "—"} · Бренд:{" "}
                        {order.brand || "—"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Клиент:{" "}
                        {client ? (
                          <Link
                            href={`/clients/${client.id}`}
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

                    <div className="min-w-36 text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatMoney(order.total)}
                      </p>

                      <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {order.status}
                      </p>
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
