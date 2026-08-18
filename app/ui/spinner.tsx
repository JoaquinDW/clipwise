/**
 * The dashboard spinner. Previously this exact SVG was inlined in six files,
 * which is how three of them ended up with different sizes and colours.
 */
export default function Spinner({
  className = "h-4 w-4",
  color = "#FF3B5C",
}: {
  className?: string
  color?: string
}) {
  return (
    <svg
      className={`animate-spin flex-none ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      style={{ color }}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
