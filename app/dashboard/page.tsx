"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  activeOrderStatuses,
  formatMoney,
  normalizePhone,
  orderStatuses,
  type Client,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import { listClients, listOrders, updateOrderStatusRecord } from "@/lib/data";

export default function DashboardPage() {
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const clients = clientsState.value;
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const orders = ordersOverride || ordersState.value;
  const isLoading = !clientsState.initialized || !ordersState.initialized;

  const activeOrders = useMemo(() => {
    return orders.filter((order) => activeOrderStatuses.includes(order.status));
  }, [orders]);

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const totalSales = useMemo(() => {
    return orders
      .filter((order) => order.status !== "отменён")
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();

    return orders
      .filter((order) => new Date(order.createdAt).toDateString() === today)
      .filter((order) => order.status !== "отменён")
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const latestOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [orders]);

  const latestClients = useMemo(() => {
    return [...clients]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [clients]);

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder) {
      return;
    }

    const nextOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status: nextStatus } : order
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
      <CrmShell title="Панель управления">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-900">Загрузка панели...</p>
          <p className="mt-2 text-sm text-slate-500">
            CRM считает клиентов, заказы и продажи.
          </p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title="Панель управления">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label="Клиенты" value={String(clients.length)} />

        <StatCard label="Активные заказы" value={String(activeOrders.length)} />

        <StatCard label="Продажи сегодня" value={formatMoney(todaySales)} />

        <StatCard label="Продажи всего" value={formatMoney(totalSales)} />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Быстрые действия</h2>
          <p className="mt-1 text-sm text-slate-500">
            Основной путь работы: добавить заказ, выбрать клиента или создать нового.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Link
            href="/orders/new"
            className="rounded-xl bg-slate-900 px-5 py-4 text-left text-white hover:bg-slate-800"
          >
            <span className="block font-medium">Добавить заказ</span>
            <span className="mt-1 block text-sm text-slate-300">
              Выбрать клиента внутри формы
            </span>
          </Link>

          <Link
            href="/clients/new"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left text-slate-800 hover:bg-slate-50"
          >
            <span className="block font-medium">Добавить нового</span>
            <span className="mt-1 block text-sm text-slate-500">
              Клиент ещё не был в CRM
            </span>
          </Link>

          <Link
            href="/orders"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left text-slate-800 hover:bg-slate-50"
          >
            <span className="block font-medium">Все заказы</span>
            <span className="mt-1 block text-sm text-slate-500">
              История, экспорт и поиск
            </span>
          </Link>

          <Link
            href="/active-orders"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left text-slate-800 hover:bg-slate-50"
          >
            <span className="block font-medium">Активные заказы</span>
            <span className="mt-1 block text-sm text-slate-500">
              Что ещё не выдано
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Последние заказы
            </h2>

            <Link href="/orders" className="text-sm text-slate-500 hover:underline">
              Смотреть все
            </Link>
          </div>

          {latestOrders.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
              Заказов пока нет.
            </p>
          ) : (
            <div className="space-y-3">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {order.productName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.article || "Без артикула"} · {order.status}
                      </p>
                      {clientMap.get(order.clientId) && (
                        <p className="mt-1 text-sm text-slate-500">
                          Клиент: {clientMap.get(order.clientId)?.name} ·{" "}
                          {clientMap.get(order.clientId)?.phone}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 font-bold text-slate-900">
                      {formatMoney(order.total)}
                    </p>
                  </Link>

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    {activeOrderStatuses.includes(order.status) ? (
                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            event.target.value as OrderStatus
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-900 sm:max-w-48"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                        {order.status}
                      </p>
                    )}

                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                      Редактировать
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Новые клиенты
            </h2>

            <Link href="/clients" className="text-sm text-slate-500 hover:underline">
              Смотреть всех
            </Link>
          </div>

          {latestClients.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
              Клиентов пока нет.
            </p>
          ) : (
            <div className="space-y-3">
              {latestClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${encodeURIComponent(normalizePhone(client.phone))}`}
                  className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{client.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{client.phone}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Карточку добавил: {client.employeeName || "не записан в базе"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </CrmShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
