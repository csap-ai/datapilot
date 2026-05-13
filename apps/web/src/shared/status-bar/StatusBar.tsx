import { useStatusSlots } from './status-store';

export function StatusBar() {
  const slots = useStatusSlots();

  const left = slots.filter((s) => s.position === 'left');
  const right = slots.filter((s) => s.position === 'right');

  return (
    <footer className="flex h-[34px] shrink-0 items-center gap-3.5 border-t border-dp-border bg-dp-surface-overlay px-3 text-[0.76rem] text-dp-text-muted">
      {left.map((slot) => (
        <StatusItem key={slot.id} slot={slot} />
      ))}
      <span className="flex-1" />
      {right.map((slot) => (
        <StatusItem key={slot.id} slot={slot} />
      ))}
    </footer>
  );
}

function StatusItem({ slot }: { slot: { id: string; text: string; onClick?: () => void } }) {
  if (slot.onClick) {
    return (
      <button
        className="truncate rounded-sm border border-dp-border bg-dp-surface-solid px-2.5 py-1 text-[0.72rem] font-bold text-dp-text-secondary"
        type="button"
        onClick={slot.onClick}
      >
        {slot.text}
      </button>
    );
  }
  return <span className="truncate">{slot.text}</span>;
}
