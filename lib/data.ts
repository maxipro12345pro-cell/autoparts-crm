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
export type NewBonusTransactionInput = Omit<BonusTransaction, "id" | "createdAt">;

const cacheTtl = 15_000;
const queryCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<unknown>;
  }
>();

function getDb() {
  return getSupabaseClient();
}

function clearQueryCache() {
  queryCache.clear();
}

function readCached<T>(key: string, getValue: () => Promise<T>) {
  const cached = queryCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }

  const promise = getValue().catch((error) => {
    queryCache.delete(key);
    throw error;
  });

  queryCache.set(key, {
    expiresAt: now + cacheTtl,
    promise,
  });

  return promise;
}

function toFiniteNumber(value: string | number, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
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
    employeeName: row.employee_name || "",
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

  return readCached("clients", async () => {
    const { data, error } = await db
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as ClientRow[]).map(mapClient);
  });
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
    clearQueryCache();
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

  clearQueryCache();
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

    clearQueryCache();
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

  clearQueryCache();
  return mapClient(data as ClientRow);
}

export async function deleteClientRecord(clientId: string) {
  const db = getDb();

  if (!db) {
    writeStorageValue(
      storageKeys.clients,
      getClients().filter((client) => client.id !== clientId)
    );
    clearQueryCache();
    return;
  }

  const { error } = await db.from("clients").delete().eq("id", clientId);

  if (error) throw error;
  clearQueryCache();
}

export async function listCars(clientId?: string) {
  const db = getDb();

  if (!db) {
    return clientId
      ? getClientCars().filter((car) => car.clientId === clientId)
      : getClientCars();
  }

  return readCached(`cars:${clientId || "all"}`, async () => {
    let query = db
      .from("client_cars")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as CarRow[]).map(mapCar);
  });
}

export async function listOrders(clientId?: string) {
  const db = getDb();

  if (!db) {
    return clientId
      ? getOrders().filter((order) => order.clientId === clientId)
      : getOrders();
  }

  return readCached(`orders:${clientId || "all"}`, async () => {
    let query = db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as OrderRow[]).map(mapOrder);
  });
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

  return readCached(`bonus-transactions:${clientId || "all"}`, async () => {
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
  });
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
    clearQueryCache();
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

  clearQueryCache();
  return mapCar(data as CarRow);
}

export async function deleteCarRecord(carId: string) {
  const db = getDb();

  if (!db) {
    writeStorageValue(
      storageKeys.clientCars,
      getClientCars().filter((car) => car.id !== carId)
    );
    clearQueryCache();
    return;
  }

  const { error } = await db.from("client_cars").delete().eq("id", carId);

  if (error) throw error;
  clearQueryCache();
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
    clearQueryCache();
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

  clearQueryCache();
  return mapBonusTransaction(data as BonusTransactionRow);
}

export async function getCurrentLoyaltySettings() {
  const db = getDb();

  if (!db) {
    return getLoyaltySettings();
  }

  return readCached("loyalty-settings", async () => {
    const { data, error } = await db
      .from("loyalty_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    return data
      ? mapLoyaltySettings(data as LoyaltySettingsRow)
      : defaultLoyaltySettings;
  });
}

export async function updateLoyaltySettings(settings: LoyaltySettings) {
  const db = getDb();

  if (!db) {
    writeStorageValue(storageKeys.loyaltySettings, settings);
    clearQueryCache();
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

  clearQueryCache();
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

    clearQueryCache();
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

  clearQueryCache();
  return newOrder;
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
    clearQueryCache();
  } else {
    const { error } = await db
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", order.id);

    if (error) throw error;
    clearQueryCache();
  }

  if (nextStatus !== "отменён") {
    return;
  }

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
