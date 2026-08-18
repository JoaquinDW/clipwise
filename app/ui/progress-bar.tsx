/**
 * The pipeline's progress bar.
 *
 * `indeterminate` is for the stages that genuinely cannot report a fraction —
 * a single GPT ranking call, Whisper on one chunk. Those used to leave the bar
 * parked at a number, which reads as a hang; a sweeping stripe says "working,
 * no estimate" honestly instead of inventing a percentage.
 */
export default function ProgressBar({
  value,
  indeterminate = false,
  size = "md",
  className = "",
  label,
}: {
  /** 0-100. Ignored when `indeterminate`. */
  value: number
  indeterminate?: boolean
  size?: "sm" | "md"
  className?: string
  /** Accessible name — what this bar is measuring. */
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const height = size === "sm" ? 3 : 6

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      {...(indeterminate ? {} : { "aria-valuenow": clamped })}
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, background: "rgba(255,255,255,0.08)" }}
    >
      <div
        className={indeterminate ? "progress-bar-sweep" : undefined}
        style={{
          height: "100%",
          borderRadius: 9999,
          background: "linear-gradient(135deg, #FF3B5C, #FF8C00)",
          width: indeterminate ? "35%" : `${clamped}%`,
          transition: indeterminate ? undefined : "width 0.4s ease",
        }}
      />
    </div>
  )
}
