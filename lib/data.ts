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
export type NewCarInput = Omit<ClientCar, "id" | "createdAt">;
export type NewOrderInput = Omit<Order, "id" | "createdAt">;
export type NewBonusTransactionInput = Omit<BonusTransaction, "id" | "createdAt">;

function getDb() {
  return getSupabaseClient();
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
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
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
    amount: Number(row.amount),
    comment: row.comment,
    employeeName: row.employee_name,
    createdAt: row.created_at,
  };
}

function mapLoyaltySettings(row: LoyaltySettingsRow): LoyaltySettings {
  return {
    bonusPercent: Number(row.bonus_percent),
    minPurchaseAmount: Number(row.min_purchase_amount),
    maxRedeemPercent: Number(row.max_redeem_percent),
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
  const clientPayload = {
    name: input.name,
    phone: input.phone,
    normalized_phone: normalizePhone(input.phone),
    email: input.email || null,
    birth_date: input.birthDate || null,
    city: input.city || null,
    comment: input.comment || null,
    notes: input.notes || null,
    created_at: createdAt,
  };

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

  let result = await db
    .from("clients")
    .insert(clientPayload)
    .select("*")
    .single();

  if (
    result.error?.code === "PGRST204" &&
    result.error.message.includes("normalized_phone")
  ) {
    const fallbackPayload: Omit<typeof clientPayload, "normalized_phone"> &
      Partial<Pick<typeof clientPayload, "normalized_phone">> = {
      ...clientPayload,
    };
    delete fallbackPayload.normalized_phone;

    result = await db
      .from("clients")
      .insert(fallbackPayload)
      .select("*")
      .single();
  }

  const { data, error } = result;

  if (error) throw error;

  return mapClient(data as ClientRow);
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

export async function listBonusTransactions() {
  const db = getDb();

  if (!db) {
    return getBonusTransactions();
  }

  const { data, error } = await db
    .from("bonus_transactions")
    .select("*")
    .order("created_at", { ascending: false });

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
