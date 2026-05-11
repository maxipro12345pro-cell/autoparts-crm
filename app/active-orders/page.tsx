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

export default function ActiveOrdersPage() {
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const clients = clientsState.value;
  const orders = ordersOverride || ordersState.value;
  const [search, setSearch] = useState("");
  const isLoading = !clientsState.initialized || !ordersState.initialized;

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const activeOrders = useMemo(() => {
    const query = search.toLowerCase().trim();

    return orders
      .filter((order) => activeOrderStatuses.includes(order.status))
      .filter((order) => {
        const client = clientMap.get(order.clientId);

        if (!query) return true;

        return (
          order.productName.toLowerCase().includes(query) ||
          order.article.toLowerCase().includes(query) ||
          order.brand.toLowerCase().includes(query) ||
          client?.name.toLowerCase().includes(query) ||
          client?.phone.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, clientMap, search]);

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder) {
      return;
    }

    const nextOrders = orders.map((order) => {
      if (order.id !== orderId) return order;

      return {
        ...order,
        status: nextStatus,
      };
    });

    setOrdersOverride(nextOrders);
    await updateOrderStatusRecord(currentOrder, nextStatus);
  }

  if (isLoading) {
    return (
      <CrmShell title="Активные заказы">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-900">Загрузка активных заказов...</p>
          <p className="mt-2 text-sm text-slate-500">
            CRM получает текущие заказы из базы.
          </p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title="Активные заказы">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Заказы в работе
          </h3>
          <p className="mt-1 text-slate-600">
            Здесь отображаются заказы, которые ещё не выданы и не отменены.
          </p>
        </div>

        <Link
          href="/orders"
          className="inline-flex justify-center rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-white"
        >
          Все заказы
        </Link>
      </div>

      <div className="mb-6 grid gap-5 md:grid-cols-4">
        <StatusCard
          label="Оформлен"
          value={orders.filter((order) => order.status === "оформлен").length}
        />

        <StatusCard
          label="Заказан"
          value={orders.filter((order) => order.status === "заказан").length}
        />

        <StatusCard
          label="В пути"
          value={orders.filter((order) => order.status === "в пути").length}
        />

        <StatusCard
          label="Доставлен"
          value={orders.filter((order) => order.status === "доставлен").length}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Быстрый поиск
        </label>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          placeholder="Клиент, телефон, товар, артикул или бренд"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {activeOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            Активных заказов нет.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activeOrders.map((order) => {
              const client = clientMap.get(order.clientId);

              return (
                <div key={order.id} className="p-5 hover:bg-slate-50">
                  <div className="grid gap-5 lg:grid-cols-[1fr_220px_180px]">
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
                        Кол-во: {order.quantity} · Сумма:{" "}
                        {formatMoney(order.total)}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(order.createdAt)} · {order.employeeName}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Изменить статус
                      </label>

                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            event.target.value as OrderStatus
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-sm text-slate-500">Текущий статус</p>
                      <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {order.status}
                      </p>

                      <p className="mt-4 text-lg font-bold text-slate-900">
                        {formatMoney(order.total)}
                      </p>

                      <Link
                        href={`/orders/${order.id}`}
                        className="mt-4 inline-flex justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
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

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
