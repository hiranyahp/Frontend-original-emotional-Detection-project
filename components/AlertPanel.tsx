"use client";

type AlertItem = {
  level: "Low" | "Medium" | "High";
  message: string;
};

type AlertPanelProps = {
  alerts: AlertItem[];
};

export default function AlertPanel({ alerts }: AlertPanelProps) {
  const getAlertStyles = (level: AlertItem["level"]) => {
    switch (level) {
      case "High":
        return {
          card: "border-rose-200 bg-rose-50",
          bar: "bg-rose-500",
          badge: "bg-rose-100 text-rose-700 border border-rose-200",
          title: "text-rose-700",
        };
      case "Medium":
        return {
          card: "border-amber-200 bg-amber-50",
          bar: "bg-amber-500",
          badge: "bg-amber-100 text-amber-700 border border-amber-200",
          title: "text-amber-700",
        };
      case "Low":
      default:
        return {
          card: "border-sky-200 bg-sky-50",
          bar: "bg-sky-500",
          badge: "bg-sky-100 text-sky-700 border border-sky-200",
          title: "text-sky-700",
        };
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="text-lg font-bold text-slate-900">Alerts</h4>
        <p className="mt-2 text-sm text-slate-600">No alerts at the moment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-lg font-bold text-slate-900">Alerts</h4>

      <div className="mt-4 space-y-4">
        {alerts.map((alert, index) => {
          const styles = getAlertStyles(alert.level);

          return (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl border p-4 pl-5 shadow-sm ${styles.card}`}
            >
              <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.bar}`} />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
                  >
                    {alert.level} Alert
                  </span>
                </div>

                <p className="text-base leading-7 text-slate-800">
                  {alert.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}