"use client"
import axios from "axios"
import { useState } from "react"

export default function ManageBillingButton({ label = "Manage subscription" }: { label?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPortal = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const { data } = await axios.post("/api/payment/portal")
      if (!data.ok || !data.url) throw new Error(data.message)
      window.location.assign(data.url)
    } catch (err) {
      console.error(err)
      const serverMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error && err.message
            ? err.message
            : null
      setError(serverMessage ?? "Could not open the billing portal. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <button
        onClick={openPortal}
        disabled={isSubmitting}
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition hover:bg-white/10 disabled:opacity-60"
      >
        {isSubmitting ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
