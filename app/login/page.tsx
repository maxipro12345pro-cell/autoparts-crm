"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  fullName: string;
  pin: string;
};

const employees: Employee[] = [
  {
    id: "elena-railian",
    fullName: "Елена Райлян",
    pin: "1111",
  },
  {
    id: "igor-railian",
    fullName: "Игорь Райлян",
    pin: "2222",
  },
  {
    id: "nikolai-railian",
    fullName: "Николай Райлян",
    pin: "3333",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const employee = employees.find((item) => item.id === selectedEmployeeId);

    if (!employee) {
      setErrorMessage("Выберите сотрудника.");
      return;
    }

    if (employee.pin !== pin) {
      setErrorMessage("Неверный PIN-код.");
      return;
    }

    localStorage.setItem(
      "crm_employee",
      JSON.stringify({
        id: employee.id,
        fullName: employee.fullName,
      })
    );

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm border border-slate-200 sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 mb-2">
            Внутренняя CRM
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Вход сотрудника
          </h1>

          <p className="mt-3 text-slate-600">
            Выберите сотрудника и введите PIN-код.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Сотрудник
            </label>

            <select
              required
              value={selectedEmployeeId}
              onChange={(event) => {
                setSelectedEmployeeId(event.target.value);
                setErrorMessage("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="">Выберите сотрудника</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              PIN-код
            </label>

            <input
              type="password"
              required
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                setErrorMessage("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
              placeholder="Введите PIN"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            Войти
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900 mb-2">Тестовые PIN-коды:</p>
          <p>Елена Райлян — 1111</p>
          <p>Игорь Райлян — 2222</p>
          <p>Николай Райлян — 3333</p>
        </div>
      </div>
    </main>
  );
}
