"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  formatMoney,
  getEmployeeName,
  normalizePhone,
  orderStatuses,
  type Client,
  type ClientCar,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import {
  createOrderWithAutoBonus,
  listCars,
  listClients,
} from "@/lib/data";

type OrderItemDraft = {
  id: string;
  productName: string;
  article: string;
  quantity: string;
  price: string;
};

function createOrderItemDraft(): OrderItemDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    productName: "",
    article: "",
    quantity: "1",
    price: "",
  };
}

function hasOrderItemContent(item: OrderItemDraft) {
  return Boolean(
    item.productName.trim() ||
      item.article.trim() ||
      item.price.trim() ||
      (item.quantity.trim() && item.quantity.trim() !== "1")
  );
}

export default function NewOrderPage() {
  const router = useRouter();
  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const carsState = useAsyncBrowserValue<ClientCar[]>(() => listCars(), []);
  const clients = clientsState.value;
  const cars = carsState.value;
  const isLoading = !clientsState.initialized || !carsState.initialized;

  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [items, setItems] = useState<OrderItemDraft[]>([
    createOrderItemDraft(),
  ]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("оформлен");
  const [orderCarId, setOrderCarId] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const exactPhoneClient = useMemo(() => {
    const normalizedQuery = normalizePhone(clientQuery);

    if (!normalizedQuery) {
      return null;
    }

    return (
      clients.find(
        (client) => normalizePhone(client.phone) === normalizedQuery
      ) || null
    );
  }, [clientQuery, clients]);

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ||
    exactPhoneClient;

  const clientCars = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    return cars.filter((car) => car.clientId === selectedClient.id);
  }, [cars, selectedClient]);

  const clientSuggestions = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    const normalizedQuery = normalizePhone(clientQuery);

    if (!query && !normalizedQuery) {
      return [];
    }

    return clients
      .filter((client) => {
        return (
          client.name.toLowerCase().includes(query) ||
          client.phone.toLowerCase().includes(query) ||
          normalizePhone(client.phone).includes(normalizedQuery)
        );
      })
      .slice(0, 5);
  }, [clientQuery, clients]);

  const filledItems = items.filter(hasOrderItemContent);
  const orderTotal = filledItems.reduce((sum, item) => {
    const quantity = Number(item.quantity.replace(",", "."));
    const price = Number(item.price.replace(",", "."));

    if (!quantity || !price || quantity <= 0 || price <= 0) {
      return sum;
    }

    return sum + quantity * price;
  }, 0);

  function updateItem(
    itemId: string,
    field: keyof Omit<OrderItemDraft, "id">,
    value: string
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    setErrorMessage("");
  }

  function selectClient(client: Client) {
    setSelectedClientId(client.id);
    setClientQuery(client.phone);
    setOrderCarId("");
    setErrorMessage("");
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedClient) {
      setErrorMessage("Выберите клиента из подсказок или создайте нового.");
      return;
    }

    if (filledItems.length === 0) {
      setErrorMessage("Заполните хотя бы одну позицию заказа.");
      return;
    }

    for (const [index, item] of filledItems.entries()) {
      const positionName = `Позиция ${index + 1}`;
      const quantity = Number(item.quantity.replace(",", "."));
      const price = Number(item.price.replace(",", "."));

      if (!item.productName.trim()) {
        setErrorMessage(`${positionName}: введите название товара.`);
        return;
      }

      if (!quantity || quantity <= 0) {
        setErrorMessage(`${positionName}: введите корректное количество.`);
        return;
      }

      if (!price || price <= 0) {
        setErrorMessage(`${positionName}: введите корректную цену.`);
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const createdOrders: Order[] = [];

      for (const item of filledItems) {
        const quantity = Number(item.quantity.replace(",", "."));
        const price = Number(item.price.replace(",", "."));

        const order = await createOrderWithAutoBonus({
          clientId: selectedClient.id,
          carId: orderCarId || undefined,
          productName: item.productName.trim(),
          article: item.article.trim(),
          brand: "",
          quantity,
          price,
          total: quantity * price,
          status: orderStatus,
          employeeName: getEmployeeName(),
          comment: orderComment.trim(),
        });

        createdOrders.push(order);
      }

      router.push(`/orders/${createdOrders[0].id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить заказ."
      );
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <CrmShell title="Добавить заказ">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-900">Загрузка формы...</p>
          <p className="mt-2 text-sm text-slate-500">
            CRM получает клиентов и автомобили из базы.
          </p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title="Добавить заказ">
      <div className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Новый заказ / покупка
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Сначала выберите клиента, затем заполните позиции заказа.
            </p>
          </div>

          <Link
            href="/clients/new"
            className="inline-flex justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Добавить нового клиента
          </Link>
        </div>

        <form onSubmit={handleSaveOrder} className="space-y-5">
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Клиент
            </label>
            <input
              value={clientQuery}
              onChange={(event) => {
                setClientQuery(event.target.value);
                setSelectedClientId("");
                setOrderCarId("");
                setErrorMessage("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="Введите телефон или имя клиента"
            />

            {clientSuggestions.length > 0 && !selectedClientId && (
              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {clientSuggestions.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="block w-full px-4 py-3 text-left hover:bg-slate-100"
                  >
                    <span className="block font-medium text-slate-900">
                      {client.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {client.phone}
                      {client.city ? ` · ${client.city}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Выбран клиент:{" "}
                <span className="font-medium text-slate-900">
                  {selectedClient.name}
                </span>{" "}
                · {selectedClient.phone}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 md:grid-cols-[minmax(160px,1fr)_130px_95px_115px_48px]"
              >
                <input
                  value={item.productName}
                  onChange={(event) =>
                    updateItem(item.id, "productName", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder={`Позиция ${index + 1}`}
                />
                <input
                  value={item.article}
                  onChange={(event) =>
                    updateItem(item.id, "article", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Артикул"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(item.id, "quantity", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Кол-во"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(event) =>
                    updateItem(item.id, "price", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Цена"
                />
                {index === items.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((currentItems) => [
                        ...currentItems,
                        createOrderItemDraft(),
                      ])
                    }
                    className="h-12 w-12 rounded-xl border border-slate-300 text-xl font-semibold text-slate-700 hover:bg-slate-50"
                    title="Добавить позицию"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((currentItems) =>
                        currentItems.filter((current) => current.id !== item.id)
                      )
                    }
                    className="h-12 w-12 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
                    title="Удалить позицию"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

            <select
              value={orderCarId}
              onChange={(event) => setOrderCarId(event.target.value)}
              disabled={!selectedClient}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Без привязки к автомобилю</option>

              {clientCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {[car.brand, car.model, car.productionYear, car.vinOrPlate]
                    .filter(Boolean)
                    .join(" ")}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={orderComment}
            onChange={(event) => setOrderComment(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Комментарий к заказу"
          />

          <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Итого</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatMoney(orderTotal)}
              </p>
            </div>

            <button
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "Сохранение..." : "Сохранить заказ"}
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </form>
      </div>
    </CrmShell>
  );
}
