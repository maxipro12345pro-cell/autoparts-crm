import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-sm border border-slate-200 sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 mb-2">
            Internal CRM
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            CRM для магазина автозапчастей
          </h1>

          <p className="mt-4 text-slate-600">
            Внутренняя система для сотрудников: клиенты, автомобили,
            история заказов и бонусная программа.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-white font-medium hover:bg-slate-800 transition"
        >
          Войти в систему
        </Link>
      </div>
    </main>
  );
}
