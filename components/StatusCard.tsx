type StatusCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatusCard({
  title,
  value,
  subtitle,
}: StatusCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <p className="text-sm text-slate-500 mb-2">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
      {subtitle && <p className="text-sm text-slate-600 mt-2">{subtitle}</p>}
    </div>
  );
}