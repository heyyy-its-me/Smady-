import { motion } from "framer-motion";

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="progress-bar">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-primary-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-primary-500"
        />
      </div>
      <span className="text-xs font-medium text-muted">{value}%</span>
    </div>
  );
}
