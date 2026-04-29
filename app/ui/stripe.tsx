"use client"
import axios from "axios"
import { useState } from "react"
import { Button } from "./button"
import { stripeInstance } from "@/infra/stripe"

type props = {
  priceId: string
  price: string
  description: string
}

const SubscribeComponent = ({ priceId }: props) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async () => {
    if (!priceId) {
      return
    }

    setIsSubmitting(true)
    const stripe = await stripeInstance.getStripe()
    if (!stripe) {
      setIsSubmitting(false)
      return
    }
    try {
      const response = await axios.post("/api/payment/checkout_sessions", {
        priceId: priceId,
      })
      const data = response.data
      if (!data.ok) throw new Error("Something went wrong")
      await stripe.redirectToCheckout({
        sessionId: data.result.id,
      })
    } catch (error) {
      console.log(error)
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div>
      {/* Click Below button to get {description} */}
      <Button onClick={handleSubmit} disabled={!priceId || isSubmitting}>
        {isSubmitting ? "Redirecting..." : "Upgrade"}
      </Button>
    </div>
  )
}
export default SubscribeComponent
