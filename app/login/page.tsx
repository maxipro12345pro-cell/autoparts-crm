"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEmployee, storageKeys } from "@/lib/crm";

type Employee = {
  id: string;
  fullName: string;
  pin: string;
};

const employees: Employee[] = [
  {
    id: "elena-railian",
    fullName: "Елена Райлян",
    pin: "4826",
  },
  {
    id: "igor-railian",
    fullName: "Игорь Райлян",
    pin: "7394",
  },
  {
    id: "nikolai-railian",
    fullName: "Николай Шепель",
    pin: "6158",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (getEmployee()) {
      router.replace("/dashboard");
    }
  }, [router]);

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

    const employeeSession = JSON.stringify({
      id: employee.id,
      fullName: employee.fullName,
    });

    if (rememberLogin) {
      localStorage.setItem(storageKeys.employee, employeeSession);
      sessionStorage.removeItem(storageKeys.employee);
    } else {
      sessionStorage.setItem(storageKeys.employee, employeeSession);
      localStorage.removeItem(storageKeys.employee);
    }

    router.replace("/dashboard");
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

          <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(event) => setRememberLogin(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Запомнить этот браузер
              <span className="block text-slate-500">
                Если выключить, вход сохранится только до закрытия браузера.
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            Войти
          </button>
        </form>
      </div>
    </main>
  );
}
