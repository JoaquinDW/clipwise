import { loadStripe, Stripe } from "@stripe/stripe-js"
import { providersList } from "./providerDetector"

class StripeWrapper {
  stripe: Stripe | null
  stripePromise: Promise<Stripe | null> | null
  constructor() {
    this.stripe = null
    this.stripePromise = null
    if (providersList.stripe.isAvailable) {
      this.initialize()
    }
  }
  private async initialize() {
    if (!this.stripePromise) {
      this.stripePromise = loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!,
      )
    }

    this.stripe = await this.stripePromise
    return this.stripe
  }
  public async getStripe() {
    if (this.stripe) {
      return this.stripe
    }

    if (!this.stripePromise && providersList.stripe.isAvailable) {
      return this.initialize()
    }

    if (this.stripePromise) {
      this.stripe = await this.stripePromise
    }

    return this.stripe
  }
}

export const stripeInstance = new StripeWrapper()
