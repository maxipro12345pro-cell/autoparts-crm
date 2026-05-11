"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  activeOrderStatuses,
  defaultLoyaltySettings,
  formatDate,
  formatMoney,
  getEmployeeName,
  normalizePhone,
  orderStatuses,
  type BonusTransaction,
  type Client,
  type ClientCar,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import {
  createBonusTransactionRecord,
  createCarRecord,
  createOrderWithAutoBonus,
  deleteCarRecord,
  deleteClientRecord,
  getCurrentLoyaltySettings,
  listBonusTransactions,
  listCars,
  listClients,
  listOrders,
  updateClientRecord,
  updateOrderStatusRecord,
} from "@/lib/data";

type OrderItemDraft = {
  id: string;
  productName: string;
  article: string;
  brand: string;
  quantity: string;
  price: string;
};

function createOrderItemDraft(): OrderItemDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    productName: "",
    article: "",
    brand: "",
    quantity: "1",
    price: "",
  };
}

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const clientRouteId = decodeURIComponent(String(params.id));

  const clientsState = useAsyncBrowserValue<Client[]>(() => listClients(), []);
  const clients = clientsState.value;
  const savedClient = useMemo(() => {
    const normalizedRouteId = normalizePhone(clientRouteId);

    return (
      clients.find(
        (item) =>
          item.id === clientRouteId ||
          normalizePhone(item.phone) === normalizedRouteId
      ) || null
    );
  }, [clientRouteId, clients]);
  const [clientOverride, setClientOverride] = useState<Client | null>(null);
  const client = clientOverride || savedClient;
  const currentClient = client;
  const clientId = client?.id || clientRouteId;

  const savedCarsState = useAsyncBrowserValue<ClientCar[]>(
    async () => (await listCars()).filter((car) => car.clientId === clientId),
    []
  );
  const savedOrdersState = useAsyncBrowserValue<Order[]>(
    async () =>
      (await listOrders())
        .filter((order) => order.clientId === clientId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    []
  );
  const savedBonusTransactionsState = useAsyncBrowserValue<BonusTransaction[]>(
    async () =>
      (await listBonusTransactions(clientId)).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    []
  );
  const loyaltySettingsState = useAsyncBrowserValue(
    () => getCurrentLoyaltySettings(),
    defaultLoyaltySettings
  );

  const [carsOverride, setCarsOverride] = useState<ClientCar[] | null>(null);
  const [ordersOverride, setOrdersOverride] = useState<Order[] | null>(null);
  const [bonusTransactionsOverride, setBonusTransactionsOverride] = useState<
    BonusTransaction[] | null
  >(null);

  const cars = carsOverride || savedCarsState.value;
  const orders = ordersOverride || savedOrdersState.value;
  const bonusTransactions =
    bonusTransactionsOverride || savedBonusTransactionsState.value;
  const loyaltySettings = loyaltySettingsState.value;
  const isCarsLoading = !savedCarsState.initialized;
  const isOrdersLoading = !savedOrdersState.initialized;
  const isBonusLoading = !savedBonusTransactionsState.initialized;
  const isLoyaltyLoading = !loyaltySettingsState.initialized;

  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carVinOrPlate, setCarVinOrPlate] = useState("");
  const [carComment, setCarComment] = useState("");

  const [orderProductName, setOrderProductName] = useState("");
  const [orderArticle, setOrderArticle] = useState("");
  const [orderBrand, setOrderBrand] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderPrice, setOrderPrice] = useState("");
  const [additionalOrderItems, setAdditionalOrderItems] = useState<
    OrderItemDraft[]
  >([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("оформлен");
  const [orderCarId, setOrderCarId] = useState("");
  const [orderComment, setOrderComment] = useState("");

  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusComment, setBonusComment] = useState("");
  const [bonusAction, setBonusAction] = useState<"add" | "remove">("add");

  const [errorMessage, setErrorMessage] = useState("");
  const [errorArea, setErrorArea] = useState<"car" | "order" | "bonus" | "">("");
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const bonusBalance = useMemo(() => {
    return bonusTransactions.reduce((sum, transaction) => {
      return sum + transaction.amount;
    }, 0);
  }, [bonusTransactions]);

  const totalPurchases = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) => activeOrderStatuses.includes(order.status));
  }, [orders]);

  async function handleAddCar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setErrorArea("");

    if (!carBrand.trim() && !carModel.trim() && !carVinOrPlate.trim()) {
      setErrorArea("car");
      setErrorMessage("Введите хотя бы марку, модель или VIN/госномер авто.");
      return;
    }

    const newCar = await createCarRecord({
      clientId,
      brand: carBrand.trim(),
      model: carModel.trim(),
      productionYear: carYear.trim(),
      vinOrPlate: carVinOrPlate.trim(),
      comment: carComment.trim(),
    });

    setCarsOverride([newCar, ...cars]);

    setCarBrand("");
    setCarModel("");
    setCarYear("");
    setCarVinOrPlate("");
    setCarComment("");
  }

  async function handleDeleteCar(carId: string) {
    const nextCars = cars.filter((car) => car.id !== carId);
    setCarsOverride(nextCars);
    await deleteCarRecord(carId);
  }

  function addOrderItem() {
    setAdditionalOrderItems((items) => [...items, createOrderItemDraft()]);
  }

  function updateOrderItem(
    itemId: string,
    field: keyof Omit<OrderItemDraft, "id">,
    value: string
  ) {
    setAdditionalOrderItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function removeOrderItem(itemId: string) {
    setAdditionalOrderItems((items) =>
      items.filter((item) => item.id !== itemId)
    );
  }

  async function handleAddOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setErrorArea("");

    const orderItems = [
      {
        id: "main",
        productName: orderProductName,
        article: orderArticle,
        brand: orderBrand,
        quantity: orderQuantity,
        price: orderPrice,
      },
      ...additionalOrderItems,
    ];
    const employeeName = getEmployeeName();
    const createdOrders: Order[] = [];

    for (const [index, item] of orderItems.entries()) {
      const positionName = `Позиция ${index + 1}`;
      const quantity = Number(item.quantity.replace(",", "."));
      const price = Number(item.price.replace(",", "."));

      if (!item.productName.trim()) {
        setErrorArea("order");
        setErrorMessage(`${positionName}: введите название товара или запчасти.`);
        return;
      }

      if (!quantity || quantity <= 0) {
        setErrorArea("order");
        setErrorMessage(`${positionName}: введите корректное количество.`);
        return;
      }

      if (!price || price <= 0) {
        setErrorArea("order");
        setErrorMessage(`${positionName}: введите корректную цену.`);
        return;
      }
    }

    try {
      for (const item of orderItems) {
        const quantity = Number(item.quantity.replace(",", "."));
        const price = Number(item.price.replace(",", "."));

        const newOrder = await createOrderWithAutoBonus({
          clientId,
          carId: orderCarId || undefined,
          productName: item.productName.trim(),
          article: item.article.trim(),
          brand: item.brand.trim(),
          quantity,
          price,
          total: quantity * price,
          status: orderStatus,
          employeeName,
          comment: orderComment.trim(),
        });

        createdOrders.push(newOrder);
      }

      setBonusTransactionsOverride(
        await listBonusTransactions(clientId)
      );
    } catch (error) {
      setErrorArea("order");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить заказ."
      );
      return;
    }

    setOrdersOverride([...createdOrders, ...orders]);

    setOrderProductName("");
    setOrderArticle("");
    setOrderBrand("");
    setOrderQuantity("1");
    setOrderPrice("");
    setAdditionalOrderItems([]);
    setOrderStatus("оформлен");
    setOrderCarId("");
    setOrderComment("");
  }

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

  async function handleAddBonusTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setErrorArea("");

    const amount = Number(bonusAmount);

    if (!amount || amount <= 0) {
      setErrorArea("bonus");
      setErrorMessage("Введите корректную сумму бонусов.");
      return;
    }

    if (bonusAction === "remove" && amount > bonusBalance) {
      setErrorArea("bonus");
      setErrorMessage("Нельзя списать больше бонусов, чем есть на балансе.");
      return;
    }

    const employeeName = getEmployeeName();

    const newTransaction = await createBonusTransactionRecord({
      clientId,
      type: bonusAction === "add" ? "manual_accrual" : "manual_writeoff",
      amount: bonusAction === "add" ? amount : -amount,
      comment: bonusComment.trim(),
      employeeName,
    });

    setBonusTransactionsOverride([newTransaction, ...bonusTransactions]);

    setBonusAmount("");
    setBonusComment("");
    setBonusAction("add");
  }

  function handleStartEditClient() {
    if (!currentClient) return;

    setEditName(currentClient.name);
    setEditPhone(currentClient.phone);
    setEditEmail(currentClient.email || "");
    setEditBirthDate(currentClient.birthDate || "");
    setEditCity(currentClient.city || "");
    setEditComment(currentClient.comment || "");
    setEditNotes(currentClient.notes || "");
    setErrorMessage("");
    setErrorArea("");
    setIsEditingClient(true);
  }

  async function handleSaveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentClient) return;

    if (!editName.trim()) {
      setErrorArea("");
      setErrorMessage("Введите имя клиента.");
      return;
    }

    if (!editPhone.trim()) {
      setErrorArea("");
      setErrorMessage("Введите номер телефона.");
      return;
    }

    try {
      const updatedClient = await updateClientRecord({
        id: currentClient.id,
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        birthDate: editBirthDate,
        city: editCity.trim(),
        comment: editComment.trim(),
        notes: editNotes.trim(),
        employeeName: currentClient.employeeName,
      });

      setClientOverride(updatedClient);
      setIsEditingClient(false);
      setErrorMessage("");
    } catch (error) {
      setErrorArea("");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить клиента."
      );
    }
  }

  async function handleDeleteClient() {
    if (!currentClient) return;

    const confirmed = window.confirm(
      "Удалить карточку клиента? Это действие нельзя отменить."
    );

    if (!confirmed) return;

    try {
      await deleteClientRecord(currentClient.id);
      router.push("/clients");
    } catch (error) {
      setErrorArea("");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось удалить клиента."
      );
    }
  }

  if (!clientsState.initialized) {
    return (
      <CrmShell title="Загрузка клиента">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Загрузка данных клиента...</p>
        </div>
      </CrmShell>
    );
  }

  if (!currentClient) {
    return (
      <CrmShell title="Клиент не найден">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Клиент не найден или был удалён.</p>

          <Link
            href="/clients"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Вернуться к клиентам
          </Link>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title={currentClient.name}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/clients" className="text-sm text-slate-500 hover:underline">
            ← Назад к клиентам
          </Link>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {currentClient.name}
          </h3>

          <p className="mt-1 text-slate-600">{currentClient.phone}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:text-right">
          <p className="text-sm text-slate-500">Бонусный баланс</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatMoney(bonusBalance)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Всего покупок</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(totalPurchases)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Заказов</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {orders.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Активные заказы</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {activeOrders.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Автомобили</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {cars.length}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              Информация о клиенте
            </h4>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleStartEditClient}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Редактировать
              </button>

              <button
                type="button"
                onClick={handleDeleteClient}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Удалить
              </button>
            </div>

            {isEditingClient && (
              <form onSubmit={handleSaveClient} className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Имя клиента *"
                  />

                  <input
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Телефон *"
                  />

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Email"
                  />

                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(event) => setEditBirthDate(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />

                  <input
                    value={editCity}
                    onChange={(event) => setEditCity(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Город"
                  />

                  <input
                    value={editComment}
                    onChange={(event) => setEditComment(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Комментарий"
                  />
                </div>

                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Дополнительные заметки"
                />

                {errorArea === "" && errorMessage && (
                  <FormError message={errorMessage} />
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
                    Сохранить
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingClient(false);
                      setErrorMessage("");
                    }}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoItem label="Телефон" value={currentClient.phone} />
              <InfoItem label="Email" value={currentClient.email || "—"} />
              <InfoItem label="Город" value={currentClient.city || "—"} />
              <InfoItem label="Дата рождения" value={currentClient.birthDate || "—"} />
              <InfoItem label="Комментарий" value={currentClient.comment || "—"} />
              <InfoItem label="Карточку добавил" value={currentClient.employeeName || "не записан в базе"} />
              <InfoItem label="Дата создания" value={formatDate(currentClient.createdAt)} />
            </div>

            {currentClient.notes && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">
                  Дополнительные заметки
                </p>
                <p className="mt-1 text-slate-800">{currentClient.notes}</p>
              </div>
            )}
          </section>

          <section className="order-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              Автомобили клиента
            </h4>

            <form onSubmit={handleAddCar} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={carBrand}
                  onChange={(event) => setCarBrand(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Марка"
                />

                <input
                  value={carModel}
                  onChange={(event) => setCarModel(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Модель"
                />

                <input
                  value={carYear}
                  onChange={(event) => setCarYear(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Год выпуска"
                />

                <input
                  value={carVinOrPlate}
                  onChange={(event) => setCarVinOrPlate(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="VIN или госномер"
                />
              </div>

              <input
                value={carComment}
                onChange={(event) => setCarComment(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Комментарий к автомобилю"
              />

              {errorArea === "car" && errorMessage && (
                <FormError message={errorMessage} />
              )}

              <button className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
                Добавить автомобиль
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {isCarsLoading ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Загрузка автомобилей...
                </p>
              ) : cars.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Автомобили пока не добавлены.
                </p>
              ) : (
                cars.map((car) => (
                  <div
                    key={car.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {[car.brand, car.model, car.productionYear]
                          .filter(Boolean)
                          .join(" ")}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {car.vinOrPlate || "VIN/госномер не указан"}
                      </p>

                      {car.comment && (
                        <p className="mt-1 text-sm text-slate-500">
                          {car.comment}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteCar(car.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              Добавить заказ / покупку
            </h4>

            <form onSubmit={handleAddOrder} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-2 md:col-span-2">
                  <input
                    value={orderProductName}
                    onChange={(event) => setOrderProductName(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Название товара / запчасти *"
                  />

                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="h-12 w-12 shrink-0 rounded-xl border border-slate-300 text-xl font-semibold text-slate-700 hover:bg-slate-50"
                    title="Добавить позицию"
                  >
                    +
                  </button>
                </div>

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
                  value={orderQuantity}
                  onChange={(event) => setOrderQuantity(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Количество"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderPrice}
                  onChange={(event) => setOrderPrice(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Цена / шт."
                />

                <select
                  value={orderCarId}
                  onChange={(event) => setOrderCarId(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 md:col-span-2"
                >
                  <option value="">Без привязки к автомобилю</option>

                  {cars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {[car.brand, car.model, car.productionYear, car.vinOrPlate]
                        .filter(Boolean)
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </div>

              {additionalOrderItems.length > 0 && (
                <div className="space-y-3">
                  {additionalOrderItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">
                          Позиция {index + 2}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeOrderItem(item.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          value={item.productName}
                          onChange={(event) =>
                            updateOrderItem(
                              item.id,
                              "productName",
                              event.target.value
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 md:col-span-2"
                          placeholder="Название товара / запчасти *"
                        />

                        <input
                          value={item.article}
                          onChange={(event) =>
                            updateOrderItem(item.id, "article", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          placeholder="Артикул"
                        />

                        <input
                          value={item.brand}
                          onChange={(event) =>
                            updateOrderItem(item.id, "brand", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          placeholder="Бренд"
                        />

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateOrderItem(item.id, "quantity", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          placeholder="Количество"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            updateOrderItem(item.id, "price", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          placeholder="Цена / шт."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={orderComment}
                onChange={(event) => setOrderComment(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Комментарий к заказу"
              />

              {errorArea === "order" && errorMessage && (
                <FormError message={errorMessage} />
              )}

              <button className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
                Сохранить заказ
              </button>
            </form>
          </section>

          <section className="order-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              История заказов
            </h4>

            <div className="mt-5 space-y-3">
              {isOrdersLoading ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Загрузка заказов...
                </p>
              ) : orders.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Заказов пока нет.
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

                      <div className="shrink-0 sm:text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatMoney(order.total)}
                        </p>

                        {activeOrderStatuses.includes(order.status) ? (
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
                        ) : (
                          <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
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
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              Бонусная система
            </h4>

            <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-sm text-slate-300">Текущий баланс</p>
              <p className="mt-2 text-3xl font-bold">
                {formatMoney(bonusBalance)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {isLoyaltyLoading
                  ? "Загрузка правил начисления..."
                  : `Автоматическое начисление: ${loyaltySettings.bonusPercent}% от суммы покупки от ${formatMoney(loyaltySettings.minPurchaseAmount)}.`}
              </p>
            </div>

            <form onSubmit={handleAddBonusTransaction} className="mt-5 space-y-4">
              <select
                value={bonusAction}
                onChange={(event) =>
                  setBonusAction(event.target.value as "add" | "remove")
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
              >
                <option value="add">Начислить бонусы</option>
                <option value="remove">Списать бонусы</option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={bonusAmount}
                onChange={(event) => setBonusAmount(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Сумма бонусов"
              />

              <textarea
                value={bonusComment}
                onChange={(event) => setBonusComment(event.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Комментарий"
              />

              {errorArea === "bonus" && errorMessage && (
                <FormError message={errorMessage} />
              )}

              <button className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
                Сохранить операцию
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h4 className="text-lg font-bold text-slate-900">
              История бонусов
            </h4>

            <div className="mt-5 space-y-3">
              {isBonusLoading ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Загрузка бонусных операций...
                </p>
              ) : bonusTransactions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                  Бонусных операций пока нет.
                </p>
              ) : (
                bonusTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {transaction.type === "auto_accrual"
                            ? "Автоматическое начисление"
                            : transaction.type === "manual_accrual"
                              ? "Ручное начисление"
                              : "Списание бонусов"}
                        </p>

                        {transaction.comment && (
                          <p className="mt-1 text-sm text-slate-600">
                            {transaction.comment}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(transaction.createdAt)} ·{" "}
                          {transaction.employeeName}
                        </p>
                      </div>

                      <p
                        className={
                          transaction.amount >= 0
                            ? "font-bold text-emerald-600"
                            : "font-bold text-red-600"
                        }
                      >
                        {transaction.amount >= 0 ? "+" : ""}
                        {formatMoney(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
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

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
