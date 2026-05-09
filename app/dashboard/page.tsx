"use client";

import Link from "next/link";
import { useMemo } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  activeOrderStatuses,
  formatMoney,
  type Client,
  type Order,
} from "@/lib/crm";
import { listClients, listOrders } from "@/lib/data";

export default function DashboardPage() {
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const clients = clientsState.value;
  const orders = ordersState.value;

  const activeOrders = useMemo(() => {
    return orders.filter((order) => activeOrderStatuses.includes(order.status));
  }, [orders]);

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

  return (
    <CrmShell title="Панель управления">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label="Клиенты" value={String(clients.length)} />

        <StatCard label="Активные заказы" value={String(activeOrders.length)} />

        <StatCard label="Продажи сегодня" value={formatMoney(todaySales)} />

        <StatCard label="Продажи всего" value={formatMoney(totalSales)} />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Быстрые действия</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Link
            href="/clients"
            className="rounded-xl bg-slate-900 px-5 py-4 text-left font-medium text-white hover:bg-slate-800"
          >
            Найти клиента
          </Link>

          <Link
            href="/clients/new"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50"
          >
            Новый клиент
          </Link>

          <Link
            href="/orders"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50"
          >
            Все заказы
          </Link>

          <Link
            href="/active-orders"
            className="rounded-xl border border-slate-300 px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50"
          >
            Активные заказы
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
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {order.productName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.article || "Без артикула"} · {order.status}
                      </p>
                    </div>

                    <p className="shrink-0 font-bold text-slate-900">
                      {formatMoney(order.total)}
                    </p>
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
                  href={`/clients/${client.id}`}
                  className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{client.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{client.phone}</p>
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
