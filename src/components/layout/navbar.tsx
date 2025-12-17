'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-indigo-100 text-indigo-700'
        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
    }`;

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            WorkWork Ledger
          </Link>
          <div className="flex gap-2">
            <Link href="/clients" className={linkClass('/clients')}>
              客户
            </Link>
            <Link href="/projects" className={linkClass('/projects')}>
              项目
            </Link>
            <Link href="/invoices" className={linkClass('/invoices')}>
              发票
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
