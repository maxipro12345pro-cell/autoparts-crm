import {
  calculateAutoBonus,
  defaultLoyaltySettings,
  getBonusTransactions,
  getClientCars,
  getClients,
  getLoyaltySettings,
  getOrders,
  normalizePhone,
  storageKeys,
  writeStorageValue,
  type BonusTransaction,
  type Client,
  type ClientCar,
  type LoyaltySettings,
  type Order,
  type OrderStatus,
} from "@/lib/crm";
import { getSupabaseClient } from "@/lib/supabase";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  email: string | null;
  birth_date: string | null;
  city: string | null;
  comment: string | null;
  notes: string | null;
  employee_name: string | null;
  created_at: string;
};

type CarRow = {
  id: string;
  client_id: string;
  brand: string;
  model: string;
  production_year: string;
  vin_or_plate: string;
  comment: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  client_id: string;
  car_id: string | null;
  product_name: string;
  article: string;
  brand: string;
  quantity: string | number;
  price: string | number;
  total: string | number;
  status: OrderStatus;
  employee_name: string;
  comment: string;
  created_at: string;
};

type BonusTransactionRow = {
  id: string;
  client_id: string;
  order_id: string | null;
  type: BonusTransaction["type"];
  amount: string | number;
  comment: string;
  employee_name: string;
  created_at: string;
};

type LoyaltySettingsRow = {
  id: number;
  bonus_percent: string | number;
  min_purchase_amount: string | number;
  max_redeem_percent: string | number;
};

export type NewClientInput = Omit<Client, "id" | "createdAt">;
export type UpdateClientInput = Omit<Client, "createdAt">;
export type NewCarInput = Omit<ClientCar, "id" | "createdAt">;
export type NewOrderInput = Omit<Order, "id" | "createdAt">;
export type UpdateOrderInput = Omit<Order, "createdAt">;
export type NewBonusTransactionInput = Omit<BonusTransaction, "id" | "createdAt">;

function getDb() {
  return getSupabaseClient();
}

function toFiniteNumber(value: string | number, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getClientEmployeeName(row: ClientRow) {
  if (row.employee_name) {
    return row.employee_name;
  }

  if (row.name.trim().toLowerCase() === "дима" && normalizePhone(row.phone) === "069073615") {
    return "Игорь Райлян";
  }

  return "";
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    birthDate: row.birth_date || "",
    city: row.city || "",
    comment: row.comment || "",
    notes: row.notes || "",
    employeeName: getClientEmployeeName(row),
    createdAt: row.created_at,
  };
}

function mapCar(row: CarRow): ClientCar {
  return {
    id: row.id,
    clientId: row.client_id,
    brand: row.brand,
    model: row.model,
    productionYear: row.production_year,
    vinOrPlate: row.vin_or_plate,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    clientId: row.client_id,
    carId: row.car_id || undefined,
    productName: row.product_name,
    article: row.article,
    brand: row.brand,
    quantity: toFiniteNumber(row.quantity, 1),
    price: toFiniteNumber(row.price),
    total: toFiniteNumber(row.total),
    status: row.status,
    employeeName: row.employee_name,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function mapBonusTransaction(row: BonusTransactionRow): BonusTransaction {
  return {
    id: row.id,
    clientId: row.client_id,
    orderId: row.order_id || undefined,
    type: row.type,
    amount: toFiniteNumber(row.amount),
    comment: row.comment,
    employeeName: row.employee_name,
    createdAt: row.created_at,
  };
}

function mapLoyaltySettings(row: LoyaltySettingsRow): LoyaltySettings {
  return {
    bonusPercent: toFiniteNumber(
      row.bonus_percent,
      defaultLoyaltySettings.bonusPercent
    ),
    minPurchaseAmount: toFiniteNumber(
      row.min_purchase_amount,
      defaultLoyaltySettings.minPurchaseAmount
    ),
    maxRedeemPercent: toFiniteNumber(
      row.max_redeem_percent,
      defaultLoyaltySettings.maxRedeemPercent
    ),
  };
}

export async function listClients() {
  const db = getDb();

  if (!db) {
    return getClients();
  }

  const { data, error } = await db
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as ClientRow[]).map(mapClient);
}

export async function createClientRecord(input: NewClientInput) {
  const db = getDb();
  const createdAt = new Date().toISOString();

  if (!db) {
    const clients = getClients();
    const newClient: Client = {
      id: crypto.randomUUID(),
      ...input,
      createdAt,
    };

    writeStorageValue(storageKeys.clients, [newClient, ...clients]);
    return newClient;
  }

  const response = await fetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Не удалось сохранить клиента.");
  }

  return payload as Client;
}

export async function updateClientRecord(input: UpdateClientInput) {
  const db = getDb();

  if (!db) {
    const nextClients = getClients().map((client) =>
      client.id === input.id ? { ...client, ...input } : client
    );
    writeStorageValue(storageKeys.clients, nextClients);

    const updatedClient = nextClients.find((client) => client.id === input.id);
    if (!updatedClient) throw new Error("Клиент не найден.");

    return updatedClient;
  }

  const { data, error } = await db
    .from("clients")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      normalized_phone: normalizePhone(input.phone),
      email: input.email?.trim() || null,
      birth_date: input.birthDate || null,
      city: input.city?.trim() || null,
      comment: input.comment?.trim() || null,
      notes: input.notes?.trim() || null,
      employee_name: input.employeeName?.trim() || null,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;

  return mapClient(data as ClientRow);
}

export async function deleteClientRecord(clientId: string) {
  const db = getDb();

  if (!db) {
    writeStorageValue(
      storageKeys.clients,
      getClients().filter((client) => client.id !== clientId)
    );
    return;
  }

  const { error } = await db.from("clients").delete().eq("id", clientId);

  if (error) throw error;
}

export async function listCars() {
  const db = getDb();

  if (!db) {
    return getClientCars();
  }

  const { data, error } = await db
    .from("client_cars")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as CarRow[]).map(mapCar);
}

export async function listOrders() {
  const db = getDb();

  if (!db) {
    return getOrders();
  }

  const { data, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as OrderRow[]).map(mapOrder);
}

export async function listBonusTransactions(clientId?: string) {
  const db = getDb();

  if (!db) {
    return clientId
      ? getBonusTransactions().filter(
          (transaction) => transaction.clientId === clientId
        )
      : getBonusTransactions();
  }

  let query = db
    .from("bonus_transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data as BonusTransactionRow[]).map(mapBonusTransaction);
}

export async function createCarRecord(input: NewCarInput) {
  const db = getDb();
  const createdAt = new Date().toISOString();

  if (!db) {
    const cars = getClientCars();
    const newCar: ClientCar = {
      id: crypto.randomUUID(),
      ...input,
      createdAt,
    };

    writeStorageValue(storageKeys.clientCars, [newCar, ...cars]);
    return newCar;
  }

  const { data, error } = await db
    .from("client_cars")
    .insert({
      client_id: input.clientId,
      brand: input.brand,
      model: input.model,
      production_year: input.productionYear,
      vin_or_plate: input.vinOrPlate,
      comment: input.comment,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapCar(data as CarRow);
}

export async function deleteCarRecord(carId: string) {
  const db = getDb();

  if (!db) {
    writeStorageValue(
      storageKeys.clientCars,
      getClientCars().filter((car) => car.id !== carId)
    );
    return;
  }

  const { error } = await db.from("client_cars").delete().eq("id", carId);

  if (error) throw error;
}

export async function createBonusTransactionRecord(
  input: NewBonusTransactionInput
) {
  const db = getDb();
  const createdAt = new Date().toISOString();

  if (!db) {
    const transactions = getBonusTransactions();
    const newTransaction: BonusTransaction = {
      id: crypto.randomUUID(),
      ...input,
      createdAt,
    };

    writeStorageValue(storageKeys.bonusTransactions, [
      newTransaction,
      ...transactions,
    ]);
    return newTransaction;
  }

  const { data, error } = await db
    .from("bonus_transactions")
    .insert({
      client_id: input.clientId,
      order_id: input.orderId || null,
      type: input.type,
      amount: input.amount,
      comment: input.comment,
      employee_name: input.employeeName,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapBonusTransaction(data as BonusTransactionRow);
}

export async function getCurrentLoyaltySettings() {
  const db = getDb();

  if (!db) {
    return getLoyaltySettings();
  }

  const { data, error } = await db
    .from("loyalty_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;

  return data ? mapLoyaltySettings(data as LoyaltySettingsRow) : defaultLoyaltySettings;
}

export async function updateLoyaltySettings(settings: LoyaltySettings) {
  const db = getDb();

  if (!db) {
    writeStorageValue(storageKeys.loyaltySettings, settings);
    return settings;
  }

  const { data, error } = await db
    .from("loyalty_settings")
    .upsert({
      id: 1,
      bonus_percent: settings.bonusPercent,
      min_purchase_amount: settings.minPurchaseAmount,
      max_redeem_percent: settings.maxRedeemPercent,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapLoyaltySettings(data as LoyaltySettingsRow);
}

export async function createOrderWithAutoBonus(input: NewOrderInput) {
  const db = getDb();
  const createdAt = new Date().toISOString();
  const settings = await getCurrentLoyaltySettings();
  const autoBonusAmount = calculateAutoBonus(input.total, settings);

  if (!db) {
    const orders = getOrders();
    const newOrder: Order = {
      id: crypto.randomUUID(),
      ...input,
      createdAt,
    };

    writeStorageValue(storageKeys.orders, [newOrder, ...orders]);

    if (newOrder.status !== "отменён" && autoBonusAmount > 0) {
      await createBonusTransactionRecord({
        clientId: input.clientId,
        orderId: newOrder.id,
        type: "auto_accrual",
        amount: autoBonusAmount,
        comment: `Автоматическое начисление ${settings.bonusPercent}% с покупки: ${input.productName}`,
        employeeName: input.employeeName,
      });
    }

    return newOrder;
  }

  const { data, error } = await db
    .from("orders")
    .insert({
      client_id: input.clientId,
      car_id: input.carId || null,
      product_name: input.productName,
      article: input.article,
      brand: input.brand,
      quantity: input.quantity,
      price: input.price,
      total: input.total,
      status: input.status,
      employee_name: input.employeeName,
      comment: input.comment,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  const newOrder = mapOrder(data as OrderRow);

  if (newOrder.status !== "отменён" && autoBonusAmount > 0) {
    await createBonusTransactionRecord({
      clientId: input.clientId,
      orderId: newOrder.id,
      type: "auto_accrual",
      amount: autoBonusAmount,
      comment: `Автоматическое начисление ${settings.bonusPercent}% с покупки: ${input.productName}`,
      employeeName: input.employeeName,
    });
  }

  return newOrder;
}

export async function updateOrderRecord(input: UpdateOrderInput) {
  const db = getDb();

  if (!db) {
    const updatedOrder: Order = {
      ...input,
      total: input.quantity * input.price,
      createdAt:
        getOrders().find((order) => order.id === input.id)?.createdAt ||
        new Date().toISOString(),
    };
    const nextOrders = getOrders().map((order) =>
      order.id === input.id ? updatedOrder : order
    );
    writeStorageValue(storageKeys.orders, nextOrders);

    if (updatedOrder.status === "отменён") {
      await rollbackAutoBonusForCancelledOrder(updatedOrder);
    }

    return updatedOrder;
  }

  const { data, error } = await db
    .from("orders")
    .update({
      car_id: input.carId || null,
      product_name: input.productName,
      article: input.article,
      brand: input.brand,
      quantity: input.quantity,
      price: input.price,
      total: input.quantity * input.price,
      status: input.status,
      employee_name: input.employeeName,
      comment: input.comment,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;

  const updatedOrder = mapOrder(data as OrderRow);

  if (updatedOrder.status === "отменён") {
    await rollbackAutoBonusForCancelledOrder(updatedOrder);
  }

  return updatedOrder;
}

export async function updateOrderStatusRecord(
  order: Order,
  nextStatus: OrderStatus
) {
  const db = getDb();

  if (!db) {
    const nextOrders = getOrders().map((item) =>
      item.id === order.id ? { ...item, status: nextStatus } : item
    );
    writeStorageValue(storageKeys.orders, nextOrders);
  } else {
    const { error } = await db
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id);

    if (error) throw error;
  }

  if (nextStatus === "отменён") {
    await rollbackAutoBonusForCancelledOrder(order);
  }
}

async function rollbackAutoBonusForCancelledOrder(order: Order) {
  const transactions = await listBonusTransactions();
  const autoAccrual = transactions.find(
    (transaction) =>
      transaction.orderId === order.id && transaction.type === "auto_accrual"
  );
  const rollbackExists = transactions.some(
    (transaction) =>
      transaction.orderId === order.id &&
      transaction.type === "manual_writeoff" &&
      transaction.comment.includes("Отмена заказа")
  );

  if (!autoAccrual || rollbackExists || autoAccrual.amount <= 0) {
    return;
  }

  await createBonusTransactionRecord({
    clientId: order.clientId,
    orderId: order.id,
    type: "manual_writeoff",
    amount: -autoAccrual.amount,
    comment: `Отмена заказа: ${order.productName}`,
    employeeName: order.employeeName,
  });
}
