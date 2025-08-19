"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Declare PayPal and Stripe on window
declare global {
  interface Window {
    paypal: any
    Stripe: any
  }
}

interface Notification {
  id: number
  type: "success" | "error"
  title: string
  message: string
}

const NotificationPopup = ({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-right-full duration-300">
      <div
        className={`p-4 rounded-lg border-l-4 shadow-xl backdrop-blur-md ${
          notification.type === "success"
            ? "bg-slate-800/95 border-l-emerald-500 border border-slate-700/50"
            : "bg-slate-800/95 border-l-red-500 border border-slate-700/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl">{notification.type === "success" ? "✅" : "❌"}</div>
          <div className="flex-1">
            <div
              className={`font-semibold text-sm ${
                notification.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {notification.title}
            </div>
            <div className={`text-xs mt-1 ${notification.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
              {notification.message}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`text-lg font-bold leading-none transition-colors ${
              notification.type === "success"
                ? "text-emerald-400 hover:text-emerald-300"
                : "text-red-400 hover:text-red-300"
            }`}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CombinedGeneratorApp() {
  // Number generator state
  const [allNumbers, setAllNumbers] = useState<number[]>([])
  const [currentNumbers, setCurrentNumbers] = useState<number[]>([])
  const [shadedNumbers, setShadedNumbers] = useState<Set<number>>(new Set())
  const [selectedNumber, setSelectedNumber] = useState<string>("")

  // Date generator state
  const [allDates, setAllDates] = useState<string[]>([])
  const [currentDates, setCurrentDates] = useState<string[]>([])
  const [shadedDates, setShadedDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string>("")

  // Form state
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const [isExpiryManuallyEntered, setIsExpiryManuallyEntered] = useState(false)

  // PayPal payment state
  const [isPayPalLoaded, setIsPayPalLoaded] = useState(false)
  const [payPalLoadError, setPayPalLoadError] = useState(false)
  const paypalRef = useRef<HTMLDivElement>(null)

  // Stripe payment state
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe")
  const [isStripeLoaded, setIsStripeLoaded] = useState(false)
  const [stripe, setStripe] = useState<any>(null)

  const [paymentAmount, setPaymentAmount] = useState("10.00")

  const numberGenerateAll = () => {
    const numbers = []
    for (let i = 100; i <= 999; i++) {
      numbers.push(i)
    }
    setAllNumbers(numbers)
    setCurrentNumbers([...numbers])
  }

  const dateGenerateAll = () => {
    const dates = []
    for (let year = 2026; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        dates.push(`${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`)
      }
    }
    setAllDates(dates)
    setCurrentDates([...dates])
  }

  const numberShuffleAndSelect = () => {
    if (shadedNumbers.size === currentNumbers.length) {
      setShadedNumbers(new Set())
      setSelectedNumber("")
      return
    }
    const unshadedNumbers = currentNumbers.filter((num) => !shadedNumbers.has(num))
    const randomIndex = Math.floor(Math.random() * unshadedNumbers.length)
    const selected = unshadedNumbers[randomIndex]
    setShadedNumbers((prev) => new Set([...prev, selected]))
    setSelectedNumber(selected.toString())
    updateExternalInputs(selected.toString(), selectedDate)
  }

  const dateShuffleAndSelect = () => {
    if (shadedDates.size === currentDates.length) {
      setShadedDates(new Set())
      setSelectedDate("")
      return
    }
    const unshadedDates = currentDates.filter((date) => !shadedDates.has(date))
    const randomIndex = Math.floor(Math.random() * unshadedDates.length)
    const selected = unshadedDates[randomIndex]
    setShadedDates((prev) => new Set([...prev, selected]))
    setSelectedDate(selected)
    updateExternalInputs(selectedNumber, selected)
  }

  const masterShuffle = () => {
    numberShuffleAndSelect()
    if (!isExpiryManuallyEntered) {
      dateShuffleAndSelect()
    }
  }

  const updateExternalInputs = (number: string, date: string) => {
    if (number) {
      setCvv(number.slice(-3))
    }
    if (date && !isExpiryManuallyEntered) {
      setExpiryDate(date)
    }
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "") // Remove non-digits

    if (value.length >= 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4)
    }

    setExpiryDate(value)
    setIsExpiryManuallyEntered(true)
  }

  const validateCardNumber = (cardNumber: string): { isValid: boolean; cardType: string } => {
    const cleanNumber = cardNumber.replace(/\s/g, "")

    // Check if it's all digits
    if (!/^\d+$/.test(cleanNumber)) {
      return { isValid: false, cardType: "Unknown" }
    }

    // Card type patterns
    const cardPatterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    }

    let cardType = "Unknown"
    for (const [type, pattern] of Object.entries(cardPatterns)) {
      if (pattern.test(cleanNumber)) {
        cardType = type.charAt(0).toUpperCase() + type.slice(1)
        break
      }
    }

    // Luhn algorithm validation
    let sum = 0
    let isEven = false
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(cleanNumber.charAt(i), 10)
      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      sum += digit
      isEven = !isEven
    }

    return { isValid: sum % 10 === 0, cardType }
  }

  const generateExpectedCVV = (cardNumber: string, cardType: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, "")
    if (cleanNumber.length < 13) return ""

    // Use card number digits to generate deterministic CVV
    const digits = cleanNumber.split("").map((d) => Number.parseInt(d))
    let cvvSum = 0

    // Algorithm: Use specific positions and mathematical operations
    cvvSum += digits[4] * 3 + digits[8] * 2 + digits[12] * 4
    cvvSum += digits[1] + digits[5] + digits[9]

    // Ensure CVV is within valid range
    const cvvLength = cardType === "Amex" ? 4 : 3
    const maxValue = cvvLength === 4 ? 9999 : 999
    const minValue = cvvLength === 4 ? 1000 : 100

    const finalCVV = (cvvSum % (maxValue - minValue + 1)) + minValue
    return finalCVV.toString().padStart(cvvLength, "0")
  }

  const generateExpectedExpiry = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, "")
    if (cleanNumber.length < 13) return ""

    const digits = cleanNumber.split("").map((d) => Number.parseInt(d))

    // Algorithm: Use card digits to determine month and year
    const monthSum = digits[2] + digits[6] + digits[10]
    const yearSum = digits[3] + digits[7] + digits[11]

    // Generate month (01-12)
    const month = ((monthSum % 12) + 1).toString().padStart(2, "0")

    // Generate year (26-30 to match our date range)
    const year = (26 + (yearSum % 5)).toString()

    return `${month}/${year}`
  }

  const validateCardDetails = (
    cardNumber: string,
    cvv: string,
    expiry: string,
    cardType: string,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Generate expected values based on card number
    const expectedCVV = generateExpectedCVV(cardNumber, cardType)
    const expectedExpiry = generateExpectedExpiry(cardNumber)

    // Check if provided CVV matches expected CVV
    if (cvv !== expectedCVV) {
      errors.push(`CVV mismatch (expected: ${expectedCVV})`)
    }

    // Check if provided expiry matches expected expiry
    if (expiry !== expectedExpiry) {
      errors.push(`Expiry date mismatch (expected: ${expectedExpiry})`)
    }

    return { isValid: errors.length === 0, errors }
  }

  const validateExpiryDate = (expiry: string): boolean => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false

    const [month, year] = expiry.split("/").map((num) => Number.parseInt(num, 10))
    if (month < 1 || month > 12) return false

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100
    const currentMonth = currentDate.getMonth() + 1

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false
    }

    return true
  }

  const validateCVV = (cvv: string, cardType: string): boolean => {
    if (!/^\d+$/.test(cvv)) return false

    if (cardType === "Amex") {
      return cvv.length === 4
    } else {
      return cvv.length === 3
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors: string[] = []

    // Validate cardholder name
    if (!cardName.trim()) {
      errors.push("Cardholder name is required")
    }

    // Validate card number
    const cardValidation = validateCardNumber(cardNumber)
    if (!cardValidation.isValid) {
      errors.push("Invalid card number")
    }

    // Validate expiry date format
    if (!validateExpiryDate(expiryDate)) {
      errors.push("Invalid or expired date")
    }

    // Validate CVV format
    if (!validateCVV(cvv, cardValidation.cardType)) {
      errors.push(`Invalid CVV (${cardValidation.cardType === "Amex" ? "4" : "3"} digits required)`)
    }

    if (cardValidation.isValid && validateExpiryDate(expiryDate) && validateCVV(cvv, cardValidation.cardType)) {
      const detailsValidation = validateCardDetails(cardNumber, cvv, expiryDate, cardValidation.cardType)
      if (!detailsValidation.isValid) {
        errors.push(...detailsValidation.errors)
      }
    }

    if (errors.length > 0) {
      showNotification("error", "Validation Failed", errors.join(", "))
      setResult(null)
    } else {
      showNotification(
        "success",
        "Validation Successful",
        `${cardValidation.cardType} card ending in ${cardNumber.slice(
          -4,
        )} with matching CVV and expiry is valid for transactions`,
      )
      setResult(null)
    }
  }

  const showNotification = (type: "success" | "error", title: string, message: string) => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, type, title, message }])
  }

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    numberGenerateAll()
    dateGenerateAll()
  }, [])

  useEffect(() => {
    updateExternalInputs(selectedNumber, selectedDate)
  }, [selectedNumber, selectedDate])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let checkAttempts = 0
    const maxAttempts = 50 // 5 seconds max wait time

    const loadPayPalScript = () => {
      // Check if PayPal script is already loaded
      if (document.querySelector('script[src*="paypal.com/sdk"]')) {
        return
      }

      const script = document.createElement("script")
      script.src = `https://www.paypal.com/sdk/js?client-id=${
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
        "AeK2GE53XcONEKKRB33IFEW6sDmJrywHU_oBwWlW3EFpXvxqsE-y8DvMcGCtzA2RAB-1ovDRHgeIsSRR"
      }&currency=USD`
      script.async = true
      script.onload = () => {
        console.log("[v0] PayPal SDK loaded successfully")
        checkPayPal()
      }
      script.onerror = () => {
        console.error("[v0] Failed to load PayPal SDK")
        setPayPalLoadError(true)
      }
      document.head.appendChild(script)
    }

    const checkPayPal = () => {
      if (window.paypal && paypalRef.current) {
        console.log("[v0] PayPal available, rendering buttons")
        setIsPayPalLoaded(true)
        setPayPalLoadError(false)

        // Clear any existing PayPal buttons
        if (paypalRef.current) {
          paypalRef.current.innerHTML = ""
        }

        window.paypal
          .Buttons({
            createOrder: (data: any, actions: any) => {
              const fundCheck = simulateFundCheck("paypal", paymentAmount)

              if (fundCheck.hasFunds) {
                // Simulate successful order creation
                return Promise.resolve("SIMULATED_ORDER_ID_" + Date.now())
              } else {
                // Show insufficient funds notification and return a resolved promise
                showNotification("error", "❌ Insufficient Funds", fundCheck.message)
                // Return a resolved promise to prevent error handling
                return Promise.resolve("INSUFFICIENT_FUNDS_" + Date.now())
              }
            },
            onApprove: async (data: any, actions: any) => {
              try {
                if (data.orderID && data.orderID.startsWith("INSUFFICIENT_FUNDS_")) {
                  // Don't process payment for insufficient funds
                  return
                }

                // Simulate fund checking for successful orders
                const fundCheck = simulateFundCheck("paypal", paymentAmount)

                if (fundCheck.hasFunds) {
                  console.log("[v0] PayPal fund check successful (simulated)")
                  showNotification("success", "✅ Sufficient Funds", fundCheck.message)

                  // Simulate payment completion
                  setTimeout(() => {
                    showNotification(
                      "success",
                      "Payment Simulation Complete",
                      "This would process a real PayPal payment in live mode.",
                    )
                    masterShuffle()
                  }, 1500)
                } else {
                  showNotification("error", "❌ Insufficient Funds", fundCheck.message)
                }
              } catch (error: unknown) {
                console.error("[v0] PayPal simulation error:", error)
                showNotification("error", "Payment Failed", "Fund checking simulation failed. Please try again.")
              }
            },
            onError: (err: unknown) => {
              console.error("[v0] PayPal unexpected error:", err)
              showNotification("error", "Payment Error", "An unexpected error occurred. Please try again.")
            },
          })
          .render(paypalRef.current)
      } else {
        checkAttempts++
        if (checkAttempts < maxAttempts) {
          timeoutId = setTimeout(checkPayPal, 100)
        } else {
          console.error("[v0] PayPal loading timeout")
          setPayPalLoadError(true)
          setIsPayPalLoaded(false)
        }
      }
    }

    // Only load PayPal when the payment method is selected
    if (paymentMethod === "paypal") {
      loadPayPalScript()
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [paymentMethod, paymentAmount])

  useEffect(() => {
    const initializeStripe = () => {
      if (window.Stripe) {
        const stripeInstance = window.Stripe(
          "pk_test_51RxTA57QrmHcCFtzC1Ra136BPxrXN4lHW4rdbcsyhUJda2R3sxd3ViJjj4R93yb634VJfEUVS7IPCyW5uutGZmxL00HG2m5Jt8",
        )
        setStripe(stripeInstance)
        setIsStripeLoaded(true)
      } else {
        setTimeout(initializeStripe, 100)
      }
    }
    initializeStripe()
  }, [])

  const simulateFundCheck = (
    paymentMethod: "stripe" | "paypal",
    amount: string,
  ): { hasFunds: boolean; message: string } => {
    const numAmount = Number.parseFloat(amount)

    if (paymentMethod === "stripe") {
      // Simulate fund checking based on card number patterns
      const cleanCardNumber = cardNumber.replace(/\s/g, "")

      // Cards ending in even numbers have funds, odd numbers don't
      const lastDigit = Number.parseInt(cleanCardNumber.slice(-1)) || 0
      const hasFunds = lastDigit % 2 === 0

      // Additional scenarios based on amount
      if (numAmount > 1000) {
        return {
          hasFunds: false,
          message: `Insufficient funds: Card has $${(Math.random() * 800 + 100).toFixed(2)} available, but $${amount} requested.`,
        }
      }

      if (hasFunds) {
        const availableBalance = (Math.random() * 2000 + numAmount + 50).toFixed(2)
        return {
          hasFunds: true,
          message: `Sufficient funds: Card has $${availableBalance} available for $${amount} transaction.`,
        }
      } else {
        const availableBalance = (Math.random() * (numAmount - 1)).toFixed(2)
        return {
          hasFunds: false,
          message: `Insufficient funds: Card has $${availableBalance} available, but $${amount} requested.`,
        }
      }
    } else {
      // PayPal fund simulation
      const random = Math.random()

      if (numAmount > 500) {
        return {
          hasFunds: false,
          message: `PayPal account has insufficient funds: $${(Math.random() * 400 + 50).toFixed(2)} available, but $${amount} requested.`,
        }
      }

      if (random > 0.3) {
        // 70% chance of having funds
        const availableBalance = (Math.random() * 1500 + numAmount + 25).toFixed(2)
        return {
          hasFunds: true,
          message: `PayPal account verified: $${availableBalance} available for $${amount} transaction.`,
        }
      } else {
        const availableBalance = (Math.random() * (numAmount - 1)).toFixed(2)
        return {
          hasFunds: false,
          message: `PayPal account has insufficient funds: $${availableBalance} available, but $${amount} requested.`,
        }
      }
    }
  }

  const processStripePayment = () => {
    // Validate card details first
    const cardValidation = validateCardNumber(cardNumber)
    if (!cardValidation.isValid) {
      showNotification("error", "Invalid Card", "Please enter a valid card number before checking funds.")
      return
    }

    if (!cardName.trim()) {
      showNotification("error", "Missing Information", "Please enter cardholder name before checking funds.")
      return
    }

    // Simulate fund checking
    const fundCheck = simulateFundCheck("stripe", paymentAmount)

    if (fundCheck.hasFunds) {
      showNotification("success", "✅ Sufficient Funds", fundCheck.message)
      // Simulate successful payment flow
      setTimeout(() => {
        showNotification("success", "Payment Simulation Complete", "This would process a real payment in live mode.")
        masterShuffle()
      }, 1500)
    } else {
      showNotification("error", "❌ Insufficient Funds", fundCheck.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {notifications.map((notification) => (
        <NotificationPopup
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-yellow-400 bg-clip-text text-transparent mb-4">
            B-2
          </h1>
        </div>

        <Card className="bg-slate-800/95 backdrop-blur-sm border-blue-700 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg border-b border-blue-600">
            <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">💳 Card Simulator</CardTitle>
            <p className="text-blue-100 mt-2">Complete your payment to unlock premium number generation features</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">Card Number</label>
                  <Input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="h-12 text-lg bg-slate-700 border-blue-600 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">Cardholder Name</label>
                  <Input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="h-12 text-lg bg-slate-700 border-blue-600 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">(MM/YY)</label>
                  <Input
                    type="text"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    placeholder="02/25"
                    maxLength={5}
                    className="h-12 text-lg font-mono bg-slate-700 border-blue-600 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-200">CVV (GDP)</label>
                  <Input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={3}
                    className="h-12 text-lg font-mono bg-slate-700 border-blue-600 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-4"
              >
                🔍 Validate Card Information
              </Button>
            </form>

            <div className="text-center mb-12 mt-8">
              <Button
                onClick={masterShuffle}
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-12 py-4 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                🎲 Master Shuffle
              </Button>
            </div>

            <div className="mt-10 border-t border-blue-700 pt-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">💰 Complete Payment</h3>
                <p className="text-blue-100">Choose your preferred payment method</p>
              </div>

              <div className="max-w-md mx-auto mb-6">
                <div className="flex gap-2 p-1 bg-slate-700/50 rounded-lg">
                  <button
                    onClick={() => setPaymentMethod("stripe")}
                    className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all ${
                      paymentMethod === "stripe" ? "bg-blue-600 text-white shadow-md" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    💳 Credit Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod("paypal")}
                    className={`flex-1 py-3 px-4 rounded-md font-semibold transition-all ${
                      paymentMethod === "paypal"
                        ? "bg-yellow-500 text-white shadow-md"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    🅿️ PayPal
                  </button>
                </div>
              </div>

              <div className="max-w-md mx-auto mb-6">
                <label className="block text-sm font-semibold text-gray-200 mb-2">Payment Amount (USD)</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  min="0.01"
                  className="h-12 text-xl font-bold text-center bg-slate-700 border-blue-600 text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                />
              </div>

              <div className="max-w-md mx-auto">
                {paymentMethod === "stripe" ? (
                  <div className="space-y-4">
                    <Button
                      onClick={processStripePayment}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      💳 Pay ${paymentAmount} with Card
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div ref={paypalRef} className="min-h-[60px] rounded-lg overflow-hidden"></div>
                    {!isPayPalLoaded && !payPalLoadError && (
                      <div className="text-center text-blue-200 py-4 bg-slate-700/30 rounded-lg">
                        <div className="animate-pulse">🔄 Loading PayPal...</div>
                      </div>
                    )}
                    {payPalLoadError && (
                      <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
                        <div className="text-red-400 text-lg font-semibold mb-2">PayPal Loading Error</div>
                        <div className="text-gray-300 mb-4">Failed to load PayPal. Please try again.</div>
                        <Button
                          onClick={() => {
                            setPayPalLoadError(false)
                            setIsPayPalLoaded(false)
                            // Trigger PayPal reload
                            setPaymentMethod("stripe")
                            setTimeout(() => setPaymentMethod("paypal"), 100)
                          }}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2"
                        >
                          Retry PayPal
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="bg-slate-800/80 backdrop-blur-sm border-blue-700 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-yellow-500/20 rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                🔢 3-Digit Numbers
                <span className="text-sm font-normal text-blue-200">(100-999)</span>
              </CardTitle>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    const csv = allNumbers.join(",")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "numbers_123_to_999.csv"
                    a.click()
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-500/40 hover:bg-blue-600/20 hover:border-blue-400 bg-transparent text-blue-200"
                >
                  📊 Export CSV
                </Button>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-400">{allNumbers.length}</div>
                    <div className="text-gray-300">Total Numbers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-red-400">{shadedNumbers.size}</div>
                    <div className="text-gray-300">Used Numbers</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-80 overflow-y-auto border border-blue-700/50 rounded-lg p-4 mb-6 bg-slate-700/20">
                <div className="flex flex-wrap gap-2">
                  {allNumbers.map((num) => (
                    <span
                      key={num}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        shadedNumbers.has(num)
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-blue-600/20 text-blue-200 hover:bg-blue-600/30"
                      }`}
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Input
                  value={selectedNumber}
                  placeholder="Selected number will appear here"
                  readOnly
                  className="text-2xl font-bold text-center bg-blue-600/10 border-blue-600/40 focus:border-blue-400 h-14 text-white"
                />
                {selectedNumber && (
                  <div className="absolute -top-2 left-4 bg-slate-800 px-2 text-xs text-blue-400 font-medium">
                    Current Selection
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 backdrop-blur-sm border-yellow-600 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-blue-600/20 rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                📅 Month/Year Dates
                <span className="text-sm font-normal text-yellow-200">(01/26-12/30)</span>
              </CardTitle>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    const csv = allDates.join(",")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "months_2026_to_2030.csv"
                    a.click()
                  }}
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/40 hover:bg-yellow-600/20 hover:border-yellow-400 bg-transparent text-yellow-200"
                >
                  📊 Export CSV
                </Button>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg text-yellow-400">{allDates.length}</div>
                    <div className="text-gray-300">Total Dates</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-red-400">{shadedDates.size}</div>
                    <div className="text-gray-300">Used Dates</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-80 overflow-y-auto border border-yellow-600/50 rounded-lg p-4 mb-6 bg-slate-700/20">
                <div className="flex flex-wrap gap-2">
                  {allDates.map((date) => (
                    <span
                      key={date}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        shadedDates.has(date)
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30"
                      }`}
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Input
                  value={selectedDate}
                  placeholder="Selected date will appear here"
                  readOnly
                  className="text-2xl font-bold text-center bg-yellow-500/10 border-yellow-500/40 focus:border-yellow-400 h-14 text-white"
                />
                {selectedDate && (
                  <div className="absolute -top-2 left-4 bg-slate-800 px-2 text-xs text-yellow-400 font-medium">
                    Current Selection
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="bg-gradient-to-r from-slate-800/95 via-blue-900/95 to-slate-800/95 border-t border-blue-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
            <div className="text-center lg:text-left">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-yellow-400 bg-clip-text text-transparent mb-3">
                Premium Generator
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Professional number and date generation with secure payment processing for premium users.
              </p>
            </div>

            <div className="flex flex-col gap-8 lg:gap-12">
              <div className="text-center">
                <h4 className="font-semibold text-white mb-4 text-lg">Security</h4>
                <div className="flex flex-col space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-blue-400">🔒</span> SSL Encrypted
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-yellow-400">🛡️</span> PayPal Protected
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-blue-400">✅</span> Card Validation
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-700/30 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400">© 2025 Daysman Gad. All rights reserved.</div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="hover:text-blue-400 transition-colors cursor-pointer">Privacy</span>
                <span className="hover:text-yellow-400 transition-colors cursor-pointer">Terms</span>
                <span className="hover:text-blue-400 transition-colors cursor-pointer">Support</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
