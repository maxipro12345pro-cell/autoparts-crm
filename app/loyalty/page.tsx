"use client";

import { FormEvent, useState } from "react";
import CrmShell from "@/components/CrmShell";
import { useAsyncBrowserValue } from "@/lib/hooks";
import {
  defaultLoyaltySettings,
  formatMoney,
  type LoyaltySettings,
} from "@/lib/crm";
import { getCurrentLoyaltySettings, updateLoyaltySettings } from "@/lib/data";

export default function LoyaltyPage() {
  const savedSettingsState = useAsyncBrowserValue<LoyaltySettings>(
    () => getCurrentLoyaltySettings(),
    defaultLoyaltySettings
  );
  const [formValues, setFormValues] =
    useState<LoyaltySettings>(defaultLoyaltySettings);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const savedSettings = savedSettingsState.value;
  const currentSettings = settings || savedSettings;
  const currentFormValues = isEditing ? formValues : savedSettings;
  const isLoading = !savedSettingsState.initialized;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const saved = await updateLoyaltySettings(currentFormValues);
      setSettings(saved);
      setFormValues(saved);
      setIsEditing(false);
      setIsSaved(true);
      setErrorMessage("");
    } catch (error) {
      setIsSaved(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки."
      );
    }
  }

  function updateField(field: keyof LoyaltySettings, value: string) {
    setIsSaved(false);
    setErrorMessage("");
    setIsEditing(true);
    setFormValues((currentValues) => ({
      ...(isEditing ? currentValues : savedSettings),
      [field]: Number(value),
    }));
  }

  if (isLoading) {
    return (
      <CrmShell title="Бонусная программа">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-900">Загрузка настроек...</p>
          <p className="mt-2 text-sm text-slate-500">
            CRM получает правила бонусной программы.
          </p>
        </div>
      </CrmShell>
    );
  }

  return (
    <CrmShell title="Бонусная программа">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">
          Настройки бонусной программы
        </h3>
        <p className="mt-1 text-slate-600">
          Эти настройки будут применяться к новым заказам.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <h4 className="font-semibold text-slate-900">
              Редактирование настроек
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Укажите правила начисления и списания бонусов для будущих продаж.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Процент автоматического начисления бонусов
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={currentFormValues.bonusPercent}
                onChange={(event) =>
                  updateField("bonusPercent", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Минимальная сумма покупки для начисления бонусов
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={currentFormValues.minPurchaseAmount}
                onChange={(event) =>
                  updateField("minPurchaseAmount", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Максимальный процент списания бонусами от суммы заказа
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={currentFormValues.maxRedeemPercent}
                onChange={(event) =>
                  updateField("maxRedeemPercent", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Сохранить настройки
            </button>

            {isSaved && (
              <p className="text-sm font-medium text-slate-600">
                Настройки сохранены.
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h4 className="font-semibold text-slate-900">
              Текущие настройки
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Значения, которые сейчас записаны в CRM.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Начисление бонусов</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {currentSettings.bonusPercent}%
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Минимальная покупка</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatMoney(currentSettings.minPurchaseAmount)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Максимальное списание</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {currentSettings.maxRedeemPercent}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </CrmShell>
  );
}
