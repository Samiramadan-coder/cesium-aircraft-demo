import { cn } from "cn";

/**
 * The centred card behind full-page states (route errors, not found):
 * an icon, a title, a short explanation and an optional action.
 */
export default function StatusCard({
  icon: Icon,
  tone = "danger",
  title,
  description,
  children,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger" | "muted";
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "title">) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10",
        props.className,
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          tone === "danger"
            ? "bg-danger/10 text-danger"
            : "bg-card-2 text-foreground-2",
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <div className="text-sm text-foreground-2">{description}</div>
      </div>
      {children}
    </div>
  );
}
