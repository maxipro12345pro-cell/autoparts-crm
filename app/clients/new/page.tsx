"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CrmShell from "@/components/CrmShell";
import {
  normalizePhone,
} from "@/lib/crm";
import { createClientRecord, listClients } from "@/lib/data";

export default function NewClientPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

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

      const phoneExists = clients.some(
        (client) => normalizePhone(client.phone) === normalizedPhone
      );

      if (phoneExists) {
        setErrorMessage("Клиент с таким номером телефона уже существует.");
        return;
      }

      await createClientRecord({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthDate,
        city: city.trim(),
        comment: comment.trim(),
        notes: notes.trim(),
      });
    } catch {
      setErrorMessage("Не удалось сохранить клиента. Попробуйте ещё раз.");
      return;
    }

    router.push("/clients");
  }

  return (
    <CrmShell title="Новый клиент">
      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3">
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
