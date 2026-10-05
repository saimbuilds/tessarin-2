import { LOGO_SHARD_PATH, LOGO_VIEWBOX, LOGO_WHITE_PATH } from "@/lib/logo";

type Props = {
  className?: string;
  title?: string;
  shardClassName?: string;
  letterClassName?: string;
};

/** The Tessarin wordmark. Letters use currentColor; the shard stays smalti red. */
export function Logo({ className, title = "Tessarin", shardClassName, letterClassName }: Props) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <path d={LOGO_WHITE_PATH} fill="currentColor" className={letterClassName} />
      <path d={LOGO_SHARD_PATH} fill="#E8462A" className={shardClassName} />
    </svg>
  );
}

/** Just the shard, for the cursor, icons and decoration. */
export function Shard({ className, fill = "#E8462A" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 324 168" className={className} aria-hidden>
      <path d="M0 168 L119 168 L324 0 L144 0 Z" fill={fill} />
    </svg>
  );
}
