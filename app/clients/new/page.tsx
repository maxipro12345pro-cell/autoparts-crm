"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CrmShell from "@/components/CrmShell";
import {
  formatMoney,
  getEmployeeName,
  normalizePhone,
  orderStatuses,
  type OrderStatus,
} from "@/lib/crm";
import {
  createClientRecord,
  createOrderWithAutoBonus,
  listClients,
} from "@/lib/data";

export default function NewClientPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState("");
  const [orderProductName, setOrderProductName] = useState("");
  const [orderArticle, setOrderArticle] = useState("");
  const [orderBrand, setOrderBrand] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("оформлен");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderComment, setOrderComment] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const orderQuantityNumber = Number(orderQuantity.replace(",", "."));
  const orderPriceNumber = Number(orderPrice.replace(",", "."));
  const orderTotal =
    Number.isFinite(orderQuantityNumber) && Number.isFinite(orderPriceNumber)
      ? orderQuantityNumber * orderPriceNumber
      : 0;

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Введите имя клиента.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Введите номер телефона.");
      return;
    }

    try {
      const clients = await listClients();
      const normalizedPhone = normalizePhone(phone);

      const existingClient = clients.find(
        (client) => normalizePhone(client.phone) === normalizedPhone
      );

      if (existingClient) {
        setErrorMessage(
          existingClient.employeeName
            ? `Клиент с таким номером уже есть. Карточку добавил: ${existingClient.employeeName}.`
            : "Клиент с таким номером уже есть."
        );
        return;
      }

      const shouldCreateOrder =
        orderProductName.trim() ||
        orderArticle.trim() ||
        orderBrand.trim() ||
        orderPrice.trim() ||
        orderComment.trim();

      if (shouldCreateOrder && !orderProductName.trim()) {
        setErrorMessage("Введите название товара или запчасти.");
        return;
      }

      if (
        shouldCreateOrder &&
        (!orderQuantityNumber || orderQuantityNumber <= 0)
      ) {
        setErrorMessage("Введите корректное количество.");
        return;
      }

      if (shouldCreateOrder && (!orderPriceNumber || orderPriceNumber <= 0)) {
        setErrorMessage("Введите корректную цену.");
        return;
      }

      const newClient = await createClientRecord({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthDate,
        city: city.trim(),
        comment: comment.trim(),
        notes: notes.trim(),
        employeeName: getEmployeeName(),
      });

      if (shouldCreateOrder) {
        await createOrderWithAutoBonus({
          clientId: newClient.id,
          productName: orderProductName.trim(),
          article: orderArticle.trim(),
          brand: orderBrand.trim(),
          quantity: orderQuantityNumber,
          price: orderPriceNumber,
          total: orderTotal,
          status: orderStatus,
          employeeName: getEmployeeName(),
          comment: orderComment.trim(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить клиента. Попробуйте ещё раз.";

      setErrorMessage(message);
      return;
    }

    router.push("/clients");
  }

  return (
    <CrmShell title="Новый клиент">
      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            Создание карточки клиента
          </h3>
          <p className="mt-1 text-slate-600">
            Обязательные поля: имя клиента и номер телефона.
          </p>
        </div>

        <form onSubmit={handleCreateClient} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Имя клиента *
              </label>
              <input
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Например: Иван Петров"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Телефон *
              </label>
              <input
                required
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="+373..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Дата рождения
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Город
              </label>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Кишинёв"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Комментарий
              </label>
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Например: постоянный клиент"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Дополнительные заметки
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Любая дополнительная информация о клиенте"
            />
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-lg font-bold text-slate-900">
              Добавить заказ / покупку
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Блок можно оставить пустым и создать только карточку клиента.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={orderProductName}
                onChange={(event) => {
                  setOrderProductName(event.target.value);
                  setErrorMessage("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Название товара / запчасти *"
              />

              <input
                value={orderArticle}
                onChange={(event) => setOrderArticle(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Артикул"
              />

              <input
                value={orderBrand}
                onChange={(event) => setOrderBrand(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Бренд"
              />

              <select
                value={orderStatus}
                onChange={(event) =>
                  setOrderStatus(event.target.value as OrderStatus)
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
              >
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={orderQuantity}
                onChange={(event) => {
                  setOrderQuantity(event.target.value);
                  setErrorMessage("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Количество"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={orderPrice}
                onChange={(event) => {
                  setOrderPrice(event.target.value);
                  setErrorMessage("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Цена"
              />
            </div>

            <textarea
              value={orderComment}
              onChange={(event) => setOrderComment(event.target.value)}
              className="mt-4 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Комментарий к заказу"
            />

            {orderTotal > 0 && (
              <p className="mt-3 text-sm font-medium text-slate-700">
                Итого: {formatMoney(orderTotal)}
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800"
            >
              Сохранить клиента
            </button>

            <button
              type="button"
              onClick={() => router.push("/clients")}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </CrmShell>
  );
}
