"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
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

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = String(params.id);
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const [orderOverride, setOrderOverride] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const order =
    orderOverride || ordersState.value.find((item) => item.id === orderId);
  const client = useMemo(() => {
    if (!order) return null;

    return (
      clientsState.value.find((item) => item.id === order.clientId) || null
    );
  }, [clientsState.value, order]);
  const isLoading = !clientsState.initialized || !ordersState.initialized;

  async function handleStatusChange(nextStatus: OrderStatus) {
    if (!order) return;

    const previousOrder = order;
    const nextOrder = {
      ...order,
      status: nextStatus,
    };

    setOrderOverride(nextOrder);
    setErrorMessage("");

    try {
      await updateOrderStatusRecord(previousOrder, nextStatus);
    } catch (error) {
      setOrderOverride(previousOrder);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось изменить статус заказа."
      );
    }
  }

  if (isLoading) {
    return (
      <CrmShell title="Загрузка заказа">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Загрузка данных заказа...</p>
        </div>
      </CrmShell>
    );
  }

  if (!order) {
    return (
      <CrmShell title="Заказ не найден">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Заказ не найден или был удален.</p>
          <Link
            href="/orders"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Вернуться к заказам
          </Link>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title={order.productName}>
      <div className="mb-6">
        <Link href="/orders" className="text-sm text-slate-500 hover:underline">
          ← Назад к заказам
        </Link>
        <h3 className="mt-2 text-2xl font-bold text-slate-900">
          {order.productName}
        </h3>
        <p className="mt-1 text-slate-600">
          {formatDate(order.createdAt)} · {order.employeeName}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-slate-900">Данные заказа</h4>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoItem label="Товар / запчасть" value={order.productName} />
            <InfoItem label="Статус" value={order.status} />
            <InfoItem label="Артикул" value={order.article || "—"} />
            <InfoItem label="Бренд" value={order.brand || "—"} />
            <InfoItem label="Количество" value={String(order.quantity)} />
            <InfoItem label="Цена / шт." value={formatMoney(order.price)} />
            <InfoItem label="Сумма" value={formatMoney(order.total)} />
            <InfoItem label="Сотрудник" value={order.employeeName || "—"} />
          </div>

          {order.comment && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Комментарий</p>
              <p className="mt-1 text-slate-800">{order.comment}</p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-semibold text-slate-900">Клиент</h4>

            {client ? (
              <Link
                href={`/clients/${encodeURIComponent(normalizePhone(client.phone))}`}
                className="mt-4 block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <p className="font-medium text-slate-900">{client.name}</p>
                <p className="mt-1 text-sm text-slate-600">{client.phone}</p>
              </Link>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-600">
                Клиент не найден.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-semibold text-slate-900">Статус</h4>

            {activeOrderStatuses.includes(order.status) ? (
              <select
                value={order.status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as OrderStatus)
                }
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
              >
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-600">
                Заказ завершен. Текущий статус: {order.status}
              </p>
            )}

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </section>
        </aside>
      </div>
    </CrmShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}
