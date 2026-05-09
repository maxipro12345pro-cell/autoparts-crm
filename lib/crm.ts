export type EmployeeSession = {
  id: string;
  fullName: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  city?: string;
  comment?: string;
  notes?: string;
  createdAt: string;
};

export type ClientCar = {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  productionYear: string;
  vinOrPlate: string;
  comment: string;
  createdAt: string;
};

export type OrderStatus =
  | "оформлен"
  | "заказан"
  | "в пути"
  | "доставлен"
  | "выдан клиенту"
  | "отменён";

export type Order = {
  id: string;
  clientId: string;
  carId?: string;
  productName: string;
  article: string;
  brand: string;
  quantity: number;
  price: number;
  total: number;
  status: OrderStatus;
  employeeName: string;
  comment: string;
  createdAt: string;
};

export type BonusTransaction = {
  id: string;
  clientId: string;
  orderId?: string;
  type: "auto_accrual" | "manual_accrual" | "manual_writeoff";
  amount: number;
  comment: string;
  employeeName: string;
  createdAt: string;
};

export type LoyaltySettings = {
  bonusPercent: number;
  minPurchaseAmount: number;
  maxRedeemPercent: number;
};

export const storageKeys = {
  employee: "crm_employee",
  clients: "crm_clients",
  clientCars: "crm_client_cars",
  orders: "crm_orders",
  bonusTransactions: "crm_bonus_transactions",
  loyaltySettings: "crm_loyalty_settings",
} as const;

export const orderStatuses: OrderStatus[] = [
  "оформлен",
  "заказан",
  "в пути",
  "доставлен",
  "выдан клиенту",
  "отменён",
];

export const activeOrderStatuses: OrderStatus[] = [
  "оформлен",
  "заказан",
  "в пути",
  "доставлен",
];

export const defaultLoyaltySettings: LoyaltySettings = {
  bonusPercent: 3,
  minPurchaseAmount: 0,
  maxRedeemPercent: 30,
};

export function formatMoney(value: number) {
  return `${value.toFixed(2)} лей`;
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function readStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
      return fallback;
    }

    return JSON.parse(savedValue) as T;
  } catch {
    return fallback;
  }
}

export function readStorageArray<T>(key: string): T[] {
  const value = readStorageValue<unknown>(key, []);

  return Array.isArray(value) ? (value as T[]) : [];
}

export function writeStorageValue<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getClients() {
  return readStorageArray<Client>(storageKeys.clients);
}

export function getClientCars() {
  return readStorageArray<ClientCar>(storageKeys.clientCars);
}

export function getOrders() {
  return readStorageArray<Order>(storageKeys.orders);
}

export function getBonusTransactions() {
  return readStorageArray<BonusTransaction>(storageKeys.bonusTransactions);
}

export function getEmployee() {
  return readStorageValue<EmployeeSession | null>(storageKeys.employee, null);
}

export function getEmployeeName() {
  return getEmployee()?.fullName || "Сотрудник";
}

export function getLoyaltySettings() {
  const settings = readStorageValue<Partial<LoyaltySettings>>(
    storageKeys.loyaltySettings,
    defaultLoyaltySettings
  );

  return {
    ...defaultLoyaltySettings,
    ...settings,
  };
}

export function calculateAutoBonus(total: number, settings = getLoyaltySettings()) {
  if (total < settings.minPurchaseAmount) {
    return 0;
  }

  return Math.round(total * (settings.bonusPercent / 100) * 100) / 100;
}
