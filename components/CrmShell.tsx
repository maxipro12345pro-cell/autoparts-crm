"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBrowserValue } from "@/lib/hooks";
import { getEmployee, storageKeys, type EmployeeSession } from "@/lib/crm";

type CrmShellProps = {
  children: React.ReactNode;
  title: string;
};

const menuItems = [
  {
    label: "Панель",
    href: "/dashboard",
  },
  {
    label: "Клиенты",
    href: "/clients",
  },
  {
    label: "Новый клиент",
    href: "/clients/new",
  },
  {
    label: "Заказы",
    href: "/orders",
  },
  {
    label: "Активные заказы",
    href: "/active-orders",
  },
  {
    label: "Бонусы",
    href: "/loyalty",
  },
];

export default function CrmShell({ children, title }: CrmShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const employee = useBrowserValue<EmployeeSession | null>(
    () => getEmployee(),
    null
  );

  useEffect(() => {
    if (!employee) {
      router.replace("/login");
    }
  }, [employee, router]);

  useEffect(() => {
    function guardProtectedPage() {
      if (!getEmployee()) {
        router.replace("/login");
      }
    }

    window.addEventListener("pageshow", guardProtectedPage);
    window.addEventListener("focus", guardProtectedPage);

    return () => {
      window.removeEventListener("pageshow", guardProtectedPage);
      window.removeEventListener("focus", guardProtectedPage);
    };
  }, [router]);

  function handleLogout() {
    localStorage.removeItem(storageKeys.employee);
    router.replace("/login");
  }

  if (!employee) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Загрузка...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white px-4 py-4 lg:static lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="mb-4 lg:mb-8">
            <p className="text-sm font-medium text-blue-600">Autoparts CRM</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Внутренняя система
            </h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:block lg:space-y-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "block whitespace-nowrap rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                      : "block whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-5 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">CRM магазина</p>
                <h2 className="break-words text-2xl font-bold text-slate-900">
                  {title}
                </h2>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="min-w-0 sm:text-right">
                  <p className="font-medium text-slate-900">
                    {employee.fullName}
                  </p>
                  <p className="text-sm text-slate-500">Сотрудник</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Выйти
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
