"use client"
import axios from "axios"
import { useState } from "react"
import { Button } from "./button"

type props = {
  priceId?: string
  buttonLabel?: string
  className?: string
}

const SubscribeComponent = ({ priceId, buttonLabel = "Upgrade", className }: props) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!priceId) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await axios.post("/api/payment/checkout_sessions", { priceId })
      const data = response.data
      if (!data.ok || !data.result?.url) throw new Error(data.message)
      // The Checkout Session URL is the supported redirect; it does not need
      // the publishable key or the legacy redirectToCheckout call.
      window.location.assign(data.result.url)
    } catch (err) {
      console.error(err)
      // Prefer the server's explanation (usually Stripe's own message).
      const serverMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error && err.message
            ? err.message
            : null
      setError(serverMessage ?? "Could not start checkout. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className={className}>
      <Button onClick={handleSubmit} disabled={!priceId || isSubmitting}>
        {isSubmitting ? "Redirecting..." : buttonLabel}
      </Button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
export default SubscribeComponent
