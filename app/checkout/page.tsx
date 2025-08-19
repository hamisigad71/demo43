import PaymentWrapper from "@/components/payment-wrapper"

export default function CheckoutPage() {
  // You can make this dynamic based on your product/service
  const amount = 29.99 // $29.99

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Checkout</h1>
          <p className="text-gray-600">Complete your purchase securely with Stripe</p>
        </div>

        <PaymentWrapper amount={amount} />
      </div>
    </div>
  )
}
