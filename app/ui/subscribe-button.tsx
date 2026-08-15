"use client"
import axios from "axios"
import { useState } from "react"
import { Button } from "./button"

type props = {
  productId?: string
  buttonLabel?: string
  className?: string
}

const SubscribeButton = ({ productId, buttonLabel = "Upgrade", className }: props) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!productId) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await axios.post("/api/payment/checkout_sessions", { productId })
      const data = response.data
      if (!data.ok || !data.result?.url) throw new Error(data.message)
      window.location.assign(data.result.url)
    } catch (err) {
      console.error(err)
      // Prefer the server's explanation (usually the provider's own message).
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
      <Button onClick={handleSubmit} disabled={!productId || isSubmitting}>
        {isSubmitting ? "Redirecting..." : buttonLabel}
      </Button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
export default SubscribeButton
