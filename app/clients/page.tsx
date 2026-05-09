"use client";

import Link from "next/link";
import { useState } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import { formatMoney, type Client, type Order } from "@/lib/crm";
import { listClients, listOrders } from "@/lib/data";

export default function ClientsPage() {
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const clients = clientsState.value;
  const orders = ordersState.value;
  const [search, setSearch] = useState("");

  const clientStats = orders.reduce(
    (stats, order) => {
      const current = stats.get(order.clientId) || { count: 0, total: 0 };
      stats.set(order.clientId, {
        count: current.count + 1,
        total: current.total + order.total,
      });
      return stats;
    },
    new Map<string, { count: number; total: number }>()
  );

  function getClientStats(clientId: string) {
    return clientStats.get(clientId) || { count: 0, total: 0 };
  }

  const filteredClients = clients.filter((client) => {
    const query = search.toLowerCase();

    return (
      client.name.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query) ||
      client.employeeName?.toLowerCase().includes(query)
    );
  });

  return (
    <CrmShell title="Клиенты">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            База клиентов
          </h3>
          <p className="mt-1 text-slate-600">
            Поиск и просмотр клиентов магазина.
          </p>
        </div>

        <Link
          href="/clients/new"
          className="inline-flex justify-center rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
        >
          Добавить клиента
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Быстрый поиск
        </label>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
          placeholder="Введите имя, телефон, email или город"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-600">Клиенты пока не найдены.</p>
            <Link
              href="/clients/new"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Создать первого клиента
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col gap-4 p-5 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {client.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {client.phone}
                    {client.city ? ` · ${client.city}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Карточку добавил: {client.employeeName || "не указано"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Заказов: {getClientStats(client.id).count} · Покупки:{" "}
                    {formatMoney(getClientStats(client.id).total)}
                  </p>
                  {client.comment && (
                    <p className="mt-1 text-sm text-slate-500">
                      {client.comment}
                    </p>
                  )}
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="inline-flex justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Открыть
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </CrmShell>
  );
}
