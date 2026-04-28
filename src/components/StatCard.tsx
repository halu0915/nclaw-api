export default function StatCard({
  label,
  value,
  sub,
  color = "blue",
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
  progress?: number;
}) {
  const colorMap = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    purple: "text-purple-400",
  };
  const barMap = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
      {progress !== undefined && (
        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
          <div
            className={`h-1.5 rounded-full transition-all ${barMap[color]}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
