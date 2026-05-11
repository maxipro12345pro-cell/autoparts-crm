"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  formatDate,
  formatMoney,
  normalizePhone,
  orderStatuses,
  type Client,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import { listClients, listOrders, updateOrderRecord } from "@/lib/data";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = String(params.id);
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const ordersState = useAsyncBrowserValue<Order[]>(() => listOrders(), []);
  const [orderOverride, setOrderOverride] = useState<Order | null>(null);

  const order =
    orderOverride || ordersState.value.find((item) => item.id === orderId);
  const client = useMemo(() => {
    if (!order) return null;

    return (
      clientsState.value.find((item) => item.id === order.clientId) || null
    );
  }, [clientsState.value, order]);
  const isLoading = !clientsState.initialized || !ordersState.initialized;

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
          <h4 className="font-semibold text-slate-900">Редактирование заказа</h4>

          <OrderEditForm order={order} onSaved={setOrderOverride} />
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
            <h4 className="font-semibold text-slate-900">Сводка</h4>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Сотрудник</span>
                <span className="text-right font-medium text-slate-900">
                  {order.employeeName || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Создан</span>
                <span className="text-right font-medium text-slate-900">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Текущая сумма</span>
                <span className="text-right font-medium text-slate-900">
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </CrmShell>
  );
}

function OrderEditForm({
  order,
  onSaved,
}: {
  order: Order;
  onSaved: (order: Order) => void;
}) {
  const [productName, setProductName] = useState(order.productName);
  const [article, setArticle] = useState(order.article);
  const [brand, setBrand] = useState(order.brand);
  const [quantity, setQuantity] = useState(String(order.quantity));
  const [price, setPrice] = useState(String(order.price));
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [comment, setComment] = useState(order.comment);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const quantityNumber = Number(quantity.replace(",", "."));
  const priceNumber = Number(price.replace(",", "."));
  const totalPreview =
    quantityNumber > 0 && priceNumber > 0 ? quantityNumber * priceNumber : 0;

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuantity = Number(quantity.replace(",", "."));
    const nextPrice = Number(price.replace(",", "."));

    if (!productName.trim()) {
      setErrorMessage("Введите название товара или запчасти.");
      setSuccessMessage("");
      return;
    }

    if (!nextQuantity || nextQuantity <= 0) {
      setErrorMessage("Введите корректное количество.");
      setSuccessMessage("");
      return;
    }

    if (!nextPrice || nextPrice <= 0) {
      setErrorMessage("Введите корректную цену за штуку.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedOrder = await updateOrderRecord({
        ...order,
        productName: productName.trim(),
        article: article.trim(),
        brand: brand.trim(),
        quantity: nextQuantity,
        price: nextPrice,
        total: nextQuantity * nextPrice,
        status,
        comment: comment.trim(),
      });

      onSaved(updatedOrder);
      setSuccessMessage("Изменения сохранены.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить изменения заказа."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSaveOrder} className="mt-5 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Товар / запчасть
          </span>
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Статус
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
          >
            {orderStatuses.map((orderStatus) => (
              <option key={orderStatus} value={orderStatus}>
                {orderStatus}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Артикул
          </span>
          <input
            value={article}
            onChange={(event) => setArticle(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Бренд
          </span>
          <input
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Количество
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Цена / шт.
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Комментарий
        </span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
        />
      </label>

      <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Итоговая сумма</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatMoney(totalPreview)}
          </p>
        </div>

        <button
          disabled={isSaving}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </form>
  );
}
