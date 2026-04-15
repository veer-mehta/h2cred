import { BarChart3, ArrowLeftRight, ShieldCheck, Store } from 'lucide-react';

const TABS = [
  { id: 'overview',    label: 'Overview',      icon: BarChart3 },
  { id: 'transfer',    label: 'Transfer',      icon: ArrowLeftRight },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'admin',       label: 'Admin & Seller', icon: ShieldCheck },
];

export default function TabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-[#1a1a1a]">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={[
            'flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors relative whitespace-nowrap',
            active === id
              ? 'text-[#e5e7eb]'
              : 'text-[#4b5563] hover:text-[#9ca3af]',
          ].join(' ')}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
          {active === id && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-[#e5e7eb]" />
          )}
        </button>
      ))}
    </div>
  );
}
