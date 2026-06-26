type Props = {
  name: string;
  username?: string;
  size?: "sm" | "md";
};

export function AvatarChip({ name, username, size = "md" }: Props) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={
        size === "sm"
          ? "flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-50"
          : "flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-zinc-50"
      }
      aria-label={username ? `${name} @${username}` : name}
    >
      {initials}
    </div>
  );
}