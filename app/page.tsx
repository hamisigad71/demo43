"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    paypal: any;
    Stripe?: any;
  }
}

interface Notification {
  id: number;
  type: "success" | "error";
  title: string;
  message: string;
}

const NotificationPopup = ({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

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
          <div className="text-xl">
            {notification.type === "success" ? "✅" : "❌"}
          </div>
          <div className="flex-1">
            <div
              className={`font-sans font-bold text-sm tracking-wide ${
                notification.type === "success"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {notification.title}
            </div>
            <div
              className={`font-sans text-xs mt-1 leading-relaxed ${
                notification.type === "success"
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {notification.message}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`text-lg font-sans font-black leading-none transition-colors ${
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
  );
};

export default function CombinedGeneratorApp() {
  // Number generator state
  const [allNumbers, setAllNumbers] = useState<number[]>([]);
  const [currentNumbers, setCurrentNumbers] = useState<number[]>([]);
  const [shadedNumbers, setShadedNumbers] = useState<Set<number>>(new Set());
  const [selectedNumber, setSelectedNumber] = useState<string>("");

  // Date generator state
  const [allDates, setAllDates] = useState<string[]>([]);
  const [currentDates, setCurrentDates] = useState<string[]>([]);
  const [shadedDates, setShadedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isExpiryManuallyEntered, setIsExpiryManuallyEntered] = useState(false);

  // PayPal payment state
  const [isPayPalLoaded, setIsPayPalLoaded] = useState(false);
  const [payPalLoadError, setPayPalLoadError] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);

  // Stripe payment state
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">(
    "stripe"
  );
  const [isStripeLoaded, setIsStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState<any>(null);

  const [paymentAmount, setPaymentAmount] = useState("10.00");

  const numberGenerateAll = () => {
    const numbers = [];
    for (let i = 100; i <= 999; i++) {
      numbers.push(i);
    }
    setAllNumbers(numbers);
    setCurrentNumbers([...numbers]);
  };

  const dateGenerateAll = () => {
    const dates = [];
    for (let year = 2026; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        dates.push(
          `${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`
        );
      }
    }
    setAllDates(dates);
    setCurrentDates([...dates]);
  };

  const numberShuffleAndSelect = () => {
    if (shadedNumbers.size === currentNumbers.length) {
      setShadedNumbers(new Set());
      setSelectedNumber("");
      return;
    }
    const unshadedNumbers = currentNumbers.filter(
      (num) => !shadedNumbers.has(num)
    );
    const randomIndex = Math.floor(Math.random() * unshadedNumbers.length);
    const selected = unshadedNumbers[randomIndex];
    setShadedNumbers((prev) => new Set([...prev, selected]));
    setSelectedNumber(selected.toString());
    setCvv(selected.toString().slice(-3));
  };

  const dateShuffleAndSelect = () => {
    if (shadedDates.size === currentDates.length) {
      setShadedDates(new Set());
      setSelectedDate("");
      return;
    }
    const unshadedDates = currentDates.filter((date) => !shadedDates.has(date));
    const selected = unshadedDates[0];
    setShadedDates((prev) => new Set([...prev, selected]));
    setSelectedDate(selected);
    if (!isExpiryManuallyEntered) {
      setExpiryDate(selected);
    }
  };

  const masterShuffle = () => {
    numberShuffleAndSelect();
  };

  const updateExternalInputs = (number: string) => {
    if (number) {
      setCvv(number.slice(-3));
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

    if (value.length >= 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }

    setExpiryDate(value);
    setIsExpiryManuallyEntered(true);
  };

  const validateCardNumber = (
    cardNumber: string
  ): { isValid: boolean; cardType: string } => {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    // Check if it's all digits
    if (!/^\d+$/.test(cleanNumber)) {
      return { isValid: false, cardType: "Unknown" };
    }

    // Card type patterns
    const cardPatterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    };

    let cardType = "Unknown";
    for (const [type, pattern] of Object.entries(cardPatterns)) {
      if (pattern.test(cleanNumber)) {
        cardType = type.charAt(0).toUpperCase() + type.slice(1);
        break;
      }
    }

    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(cleanNumber.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      isEven = !isEven;
    }

    return { isValid: sum % 10 === 0, cardType };
  };

  const generateExpectedCVV = (
    cardNumber: string,
    cardType: string
  ): string => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length < 13) return "";

    const digits = cleanNumber.split("").map((d) => Number.parseInt(d));
    let cvvSum = 0;

    // Algorithm: Use specific positions and mathematical operations
    if (digits.length > 12) {
      cvvSum +=
        (digits[4] || 0) * 3 + (digits[8] || 0) * 2 + (digits[12] || 0) * 4;
      cvvSum += (digits[1] || 0) + (digits[5] || 0) + (digits[9] || 0);
    }

    // Ensure CVV is within valid range based on card type
    const cvvLength = cardType === "Amex" ? 4 : 3;
    const maxValue = cvvLength === 4 ? 9999 : 999;
    const minValue = cvvLength === 4 ? 1000 : 100;

    const finalCVV = (cvvSum % (maxValue - minValue + 1)) + minValue;
    return finalCVV.toString().padStart(cvvLength, "0");
  };

  const generateExpectedExpiry = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length < 13) return "";

    const digits = cleanNumber.split("").map((d) => Number.parseInt(d));

    // Algorithm: Use card digits to determine month and year
    const monthSum = digits[2] + digits[6] + digits[10];
    const yearSum = digits[3] + digits[7] + digits[11];

    // Generate month (01-12)
    const month = ((monthSum % 12) + 1).toString().padStart(2, "0");

    // Generate year (26-30 to match our date range)
    const year = (26 + (yearSum % 5)).toString();

    return `${month}/${year}`;
  };

  const validateCardDetails = (
    cardNumber: string,
    cvv: string,
    expiry: string,
    cardType: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Generate expected values based on card number
    const expectedCVV = generateExpectedCVV(cardNumber, cardType);
    const expectedExpiry = generateExpectedExpiry(cardNumber);

    // Check if provided CVV matches expected CVV
    if (cvv !== expectedCVV) {
      errors.push(`CVV mismatch (expected: ${expectedCVV})`);
    }

    // Check if provided expiry matches expected expiry
    if (expiry !== expectedExpiry) {
      errors.push(`Expiry date mismatch (expected: ${expectedExpiry})`);
    }

    return { isValid: errors.length === 0, errors };
  };

  const validateCVV = (cvv: string, cardType: string): boolean => {
    if (cardType === "Amex") {
      return /^\d{4}$/.test(cvv);
    }
    return /^\d{3}$/.test(cvv);
  };

  const validateExpiryDate = (expiry: string): boolean => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;

    const [month, year] = expiry
      .split("/")
      .map((num) => Number.parseInt(num, 10));
    if (month < 1 || month > 12) return false;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    // Validate cardholder name
    if (!cardName.trim()) {
      errors.push("Cardholder name is required");
    }

    // Validate card number
    const cardValidation = validateCardNumber(cardNumber);
    if (!cardValidation.isValid) {
      errors.push("Invalid card number");
    }

    // Validate expiry date format
    if (!validateExpiryDate(expiryDate)) {
      errors.push("Invalid or expired date");
    }

    // Validate CVV format
    if (!validateCVV(cvv, cardValidation.cardType)) {
      errors.push(
        `Invalid CVV (${
          cardValidation.cardType === "Amex" ? "4" : "3"
        } digits required)`
      );
    }

    if (
      cardValidation.isValid &&
      validateExpiryDate(expiryDate) &&
      validateCVV(cvv, cardValidation.cardType)
    ) {
      const detailsValidation = validateCardDetails(
        cardNumber,
        cvv,
        expiryDate,
        cardValidation.cardType
      );
      if (!detailsValidation.isValid) {
        errors.push(...detailsValidation.errors);
      }
    }

    if (errors.length > 0) {
      showNotification("error", "Validation Failed", errors.join(", "));
      setResult(null);
    } else {
      showNotification(
        "success",
        "Validation Successful",
        `${cardValidation.cardType} card ending in ${cardNumber.slice(
          -4
        )} with matching CVV and expiry is valid for transactions`
      );
      setResult(null);
    }
  };

  const showNotification = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, title, message }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    numberGenerateAll();
    dateGenerateAll();
  }, []);

  useEffect(() => {
    updateExternalInputs(selectedNumber);
  }, [selectedNumber]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let checkAttempts = 0;
    const maxAttempts = 50; // 5 seconds max wait time

    const loadPayPalScript = () => {
      // Check if PayPal script is already loaded
      if (document.querySelector('script[src*="paypal.com/sdk"]')) {
        return;
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
        "AeK2GE53XcONEKKRB33IFEW6sDmJrywHU_oBwWlW3EFpXvxqsE-y8DvMcGCtzA2RAB-1ovDRHgeIsSRR"
      }&currency=USD`;
      script.async = true;
      script.onload = () => {
        console.log("[v0] PayPal SDK loaded successfully");
        checkPayPal();
      };
      script.onerror = () => {
        console.error("[v0] Failed to load PayPal SDK");
        setPayPalLoadError(true);
      };
      document.head.appendChild(script);
    };

    const checkPayPal = () => {
      if (window.paypal && paypalRef.current) {
        console.log("[v0] PayPal available, rendering buttons");
        setIsPayPalLoaded(true);
        setPayPalLoadError(false);

        // Clear any existing PayPal buttons
        if (paypalRef.current) {
          paypalRef.current.innerHTML = "";
        }

        window.paypal
          .Buttons({
            createOrder: (data: any, actions: any) => {
              const fundCheck = simulateFundCheck("paypal", paymentAmount);

              if (fundCheck.hasFunds) {
                // Simulate successful order creation
                return Promise.resolve("SIMULATED_ORDER_ID_" + Date.now());
              } else {
                // Show insufficient funds notification and return a resolved promise
                showNotification(
                  "error",
                  "❌ Insufficient Funds",
                  fundCheck.message
                );
                // Return a resolved promise to prevent error handling
                return Promise.resolve("INSUFFICIENT_FUNDS_" + Date.now());
              }
            },
            onApprove: async (data: any, actions: any) => {
              try {
                if (
                  data.orderID &&
                  data.orderID.startsWith("INSUFFICIENT_FUNDS_")
                ) {
                  // Don't process payment for insufficient funds
                  return;
                }

                // Simulate fund checking for successful orders
                const fundCheck = simulateFundCheck("paypal", paymentAmount);

                if (fundCheck.hasFunds) {
                  console.log("[v0] PayPal fund check successful (simulated)");
                  showNotification(
                    "success",
                    "✅ Sufficient Funds",
                    fundCheck.message
                  );

                  // Simulate payment completion
                  setTimeout(() => {
                    showNotification(
                      "success",
                      "Payment Simulation Complete",
                      "This would process a real PayPal payment in live mode."
                    );
                    numberShuffleAndSelect();
                  }, 1500);
                } else {
                  showNotification(
                    "error",
                    "❌ Insufficient Funds",
                    fundCheck.message
                  );
                }
              } catch (error: unknown) {
                console.error("[v0] PayPal simulation error:", error);
                showNotification(
                  "error",
                  "Payment Failed",
                  "Fund checking simulation failed. Please try again."
                );
              }
            },
            onError: (err: unknown) => {
              console.error("[v0] PayPal unexpected error:", err);
              showNotification(
                "error",
                "Payment Error",
                "An unexpected error occurred. Please try again."
              );
            },
          })
          .render(paypalRef.current);
      } else {
        checkAttempts++;
        if (checkAttempts < maxAttempts) {
          timeoutId = setTimeout(checkPayPal, 100);
        } else {
          console.error("[v0] PayPal loading timeout");
          setPayPalLoadError(true);
          setIsPayPalLoaded(false);
        }
      }
    };

    // Only load PayPal when the payment method is selected
    if (paymentMethod === "paypal") {
      loadPayPalScript();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [paymentMethod, paymentAmount]);

  useEffect(() => {
    const initializeStripe = () => {
      if (window.Stripe && typeof window.Stripe === "function") {
        const stripeKey =
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
          "pk_test_51RxTA57QrmHcCFtzC1Ra136BPxrXN4lHW4rdbcsyhUJda2R3sxd3ViJjj4R93yb634VJfEUVS7IPCyW5uutGZmxL00HG2m5Jt8";
        const stripeInstance = window.Stripe(stripeKey);
        setStripe(stripeInstance);
        setIsStripeLoaded(true);
      } else {
        setTimeout(initializeStripe, 100);
      }
    };
    initializeStripe();
  }, []);

  const simulateFundCheck = (
    paymentMethod: "stripe" | "paypal",
    amount: string
  ): { hasFunds: boolean; message: string } => {
    const numAmount = Number.parseFloat(amount);

    if (paymentMethod === "stripe") {
      // Simulate fund checking based on card number patterns
      const cleanCardNumber = cardNumber.replace(/\s/g, "");

      // Cards ending in even numbers have funds, odd numbers don't
      const lastDigit = Number.parseInt(cleanCardNumber.slice(-1)) || 0;
      const hasFunds = lastDigit % 2 === 0;

      // Additional scenarios based on amount
      if (numAmount > 1000) {
        return {
          hasFunds: false,
          message: `Insufficient funds: Card has $${(
            Math.random() * 800 +
            100
          ).toFixed(2)} available, but $${amount} requested.`,
        };
      }

      if (hasFunds) {
        const availableBalance = (
          Math.random() * 2000 +
          numAmount +
          50
        ).toFixed(2);
        return {
          hasFunds: true,
          message: `Sufficient funds: Card has $${availableBalance} available for $${amount} transaction.`,
        };
      } else {
        const availableBalance = (Math.random() * (numAmount - 1)).toFixed(2);
        return {
          hasFunds: false,
          message: `Insufficient funds: Card has $${availableBalance} available, but $${amount} requested.`,
        };
      }
    } else {
      // PayPal fund simulation
      const random = Math.random();

      if (numAmount > 500) {
        return {
          hasFunds: false,
          message: `PayPal account has insufficient funds: $${(
            Math.random() * 400 +
            50
          ).toFixed(2)} available, but $${amount} requested.`,
        };
      }

      if (random > 0.3) {
        // 70% chance of having funds
        const availableBalance = (
          Math.random() * 1500 +
          numAmount +
          25
        ).toFixed(2);
        return {
          hasFunds: true,
          message: `PayPal account verified: $${availableBalance} available for $${amount} transaction.`,
        };
      } else {
        const availableBalance = (Math.random() * (numAmount - 1)).toFixed(2);
        return {
          hasFunds: false,
          message: `PayPal account has insufficient funds: $${availableBalance} available, but $${amount} requested.`,
        };
      }
    }
  };

  const processStripePayment = () => {
    // Validate card details first
    const cardValidation = validateCardNumber(cardNumber);
    if (!cardValidation.isValid) {
      showNotification(
        "error",
        "Invalid Card",
        "Please enter a valid card number before checking funds."
      );
      return;
    }

    if (!cardName.trim()) {
      showNotification(
        "error",
        "Missing Information",
        "Please enter cardholder name before checking funds."
      );
      return;
    }

    // Simulate fund checking
    const fundCheck = simulateFundCheck("stripe", paymentAmount);

    if (fundCheck.hasFunds) {
      showNotification("success", "✅ Sufficient Funds", fundCheck.message);
      // Simulate successful payment flow
      setTimeout(() => {
        showNotification(
          "success",
          "Payment Simulation Complete",
          "This would process a real payment in live mode."
        );
        numberShuffleAndSelect();
      }, 1500);
    } else {
      showNotification("error", "❌ Insufficient Funds", fundCheck.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-slate-900 font-sans">
      {notifications.map((notification) => (
        <NotificationPopup
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-8xl font-sans font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4 tracking-tighter leading-none">
            B-2
          </h1>
          <p className="font-sans font-medium text-lg text-gray-300 tracking-wide">
            Premium Generator System
          </p>
        </div>

        <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-700 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-black to-gray-800 rounded-t-lg border-b border-gray-600">
            <CardTitle className="text-4xl font-sans font-black text-white flex items-center gap-3 tracking-tight">
              💳 <span className="font-mono">Card Simulator</span>
            </CardTitle>
            <p className="font-sans font-medium text-white mt-2 text-lg leading-relaxed">
              Complete your payment to unlock premium number generation features
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-sans font-bold text-gray-200 tracking-wide uppercase">
                    Card Number
                  </label>
                  <Input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="h-12 text-lg font-mono font-medium bg-white border-gray-400 text-black placeholder-gray-500 focus:border-black focus:ring-2 focus:ring-gray-300 tracking-wider"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-sans font-bold text-gray-200 tracking-wide uppercase">
                    Cardholder Name
                  </label>
                  <Input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="h-12 text-lg font-sans font-medium bg-white border-gray-400 text-black placeholder-gray-500 focus:border-black focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-sans font-bold text-gray-200 tracking-wide uppercase">
                    Expiry (MM/YY)
                  </label>
                  <Input
                    type="text"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    placeholder="02/25"
                    maxLength={5}
                    className="h-12 text-xl font-mono font-bold bg-white border-gray-400 text-black placeholder-gray-500 focus:border-black focus:ring-2 focus:ring-gray-300 text-center tracking-widest"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-sans font-bold text-gray-200 tracking-wide uppercase">
                    CVV (GDP)
                  </label>
                  <Input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="CVV"
                    className="h-12 text-xl font-mono font-black bg-white border-gray-400 text-black placeholder-gray-500 focus:border-black focus:ring-2 focus:ring-gray-300 text-center tracking-widest"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-16 text-xl font-sans font-black bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-4 tracking-wide"
              >
                🔍 <span className="font-mono">VALIDATE</span> CARD INFORMATION
              </Button>
            </form>

            <div className="text-center mb-12 mt-8">
              <Button
                onClick={masterShuffle}
                size="lg"
                className="bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-800 text-white px-12 py-4 h-16 text-2xl font-sans font-black shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 tracking-wider"
              >
                🎲 <span className="font-mono">MASTER</span> SHUFFLE
              </Button>
            </div>

            <div className="mt-10 border-t border-gray-600 pt-8">
              <div className="text-center mb-6">
                <h3 className="text-3xl font-sans font-black text-white mb-2 tracking-tight">
                  💰 Complete{" "}
                  <span className="font-mono text-white">Payment</span>
                </h3>
                <p className="font-sans font-medium text-white text-lg">
                  Choose your preferred payment method
                </p>
              </div>

              <div className="max-w-md mx-auto mb-6">
                <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setPaymentMethod("stripe")}
                    className={`flex-1 py-3 px-4 rounded-md font-sans font-bold transition-all tracking-wide ${
                      paymentMethod === "stripe"
                        ? "bg-black text-white shadow-md"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    💳 <span className="font-mono">CREDIT</span> CARD
                  </button>
                  <button
                    onClick={() => setPaymentMethod("paypal")}
                    className={`flex-1 py-3 px-4 rounded-md font-sans font-bold transition-all tracking-wide ${
                      paymentMethod === "paypal"
                        ? "bg-black text-white shadow-md border border-gray-600"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    🅿️ <span className="font-mono">PAYPAL</span>
                  </button>
                </div>
              </div>

              <div className="max-w-md mx-auto mb-6">
                <label className="block text-sm font-sans font-bold text-gray-200 mb-2 tracking-wide uppercase">
                  Payment Amount (USD)
                </label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  min="0.01"
                  className="h-14 text-2xl font-mono font-black text-center bg-white border-gray-400 text-black focus:border-black focus:ring-2 focus:ring-gray-300 tracking-wider"
                />
              </div>

              <div className="max-w-md mx-auto">
                {paymentMethod === "stripe" ? (
                  <div className="space-y-4">
                    <Button
                      onClick={processStripePayment}
                      className="w-full h-16 text-xl font-sans font-black bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white shadow-lg hover:shadow-xl transition-all duration-200 tracking-wide"
                    >
                      💳 PAY <span className="font-mono">${paymentAmount}</span>{" "}
                      WITH CARD
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div
                      ref={paypalRef}
                      className="min-h-[60px] rounded-lg overflow-hidden"
                    ></div>
                    {!isPayPalLoaded && !payPalLoadError && (
                      <div className="text-center text-white py-4 bg-gray-800 rounded-lg">
                        <div className="animate-pulse font-sans font-medium tracking-wide">
                          🔄 <span className="font-mono">LOADING</span>{" "}
                          PAYPAL...
                        </div>
                      </div>
                    )}
                    {payPalLoadError && (
                      <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
                        <div className="text-red-400 text-xl font-sans font-black mb-2 tracking-wide">
                          <span className="font-mono">PAYPAL</span> LOADING
                          ERROR
                        </div>
                        <div className="text-gray-300 mb-4 font-sans font-medium">
                          Failed to load PayPal. Please try again.
                        </div>
                        <Button
                          onClick={() => {
                            setPayPalLoadError(false);
                            setIsPayPalLoaded(false);
                            setPaymentMethod("stripe");
                            setTimeout(() => setPaymentMethod("paypal"), 100);
                          }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 font-sans font-bold tracking-wide"
                        >
                          <span className="font-mono">RETRY</span> PAYPAL
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
          <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-t-lg">
              <CardTitle className="text-3xl font-sans font-black text-white flex items-center gap-2 tracking-tight">
                🔢 <span className="font-mono">3-DIGIT</span> Numbers
                <span className="text-sm font-sans font-medium text-gray-300 tracking-normal">
                  (100-999)
                </span>
              </CardTitle>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    const csv = allNumbers.join(",");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "numbers_123_to_999.csv";
                    a.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-500/40 hover:bg-gray-600/20 hover:border-gray-400 bg-transparent text-gray-200 font-sans font-bold tracking-wide"
                >
                  📊 <span className="font-mono">EXPORT</span> CSV
                </Button>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-mono font-black text-2xl text-white tracking-wider">
                      {allNumbers.length}
                    </div>
                    <div className="font-sans font-medium text-gray-300 tracking-wide">
                      Total Numbers
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono font-black text-2xl text-red-400 tracking-wider">
                      {shadedNumbers.size}
                    </div>
                    <div className="font-sans font-medium text-gray-300 tracking-wide">
                      Used Numbers
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-80 overflow-y-auto border border-gray-600 rounded-lg p-4 mb-6 bg-gray-800/20">
                <div className="flex flex-wrap gap-2">
                  {allNumbers.map((num) => (
                    <span
                      key={num}
                      className={`px-3 py-2 text-sm font-mono font-bold rounded-md transition-all duration-200 tracking-wider ${
                        shadedNumbers.has(num)
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-gray-600/20 text-gray-200 hover:bg-gray-600/30"
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
                  className="text-3xl font-mono font-black text-center bg-white border-gray-400 focus:border-black h-16 text-black tracking-widest"
                />
                {selectedNumber && (
                  <div className="absolute -top-2 left-4 bg-gray-900 px-2 text-xs text-white font-sans font-bold tracking-wide">
                    CURRENT SELECTION
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-600 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-800/20 to-gray-600/20 rounded-t-lg">
              <CardTitle className="text-3xl font-sans font-black text-white flex items-center gap-2 tracking-tight">
                📅 <span className="font-mono">MONTH/YEAR</span> Dates
                <span className="text-sm font-sans font-medium text-gray-300 tracking-normal">
                  (01/26-12/30)
                </span>
              </CardTitle>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    const csv = allDates.join(",");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "months_2026_to_2030.csv";
                    a.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-500/40 hover:bg-gray-600/20 hover:border-gray-400 bg-transparent text-gray-200 font-sans font-bold tracking-wide"
                >
                  📊 <span className="font-mono">EXPORT</span> CSV
                </Button>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-mono font-black text-2xl text-white tracking-wider">
                      {allDates.length}
                    </div>
                    <div className="font-sans font-medium text-gray-300 tracking-wide">
                      Total Dates
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono font-black text-2xl text-red-400 tracking-wider">
                      {shadedDates.size}
                    </div>
                    <div className="font-sans font-medium text-gray-300 tracking-wide">
                      Used Dates
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-80 overflow-y-auto border border-gray-600/50 rounded-lg p-4 mb-6 bg-gray-800/20">
                <div className="flex flex-wrap gap-2">
                  {allDates.map((date) => (
                    <span
                      key={date}
                      className={`px-3 py-2 text-sm font-mono font-bold rounded-md transition-all duration-200 tracking-wider ${
                        shadedDates.has(date)
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-gray-600/20 text-gray-200 hover:bg-gray-600/30"
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
                  className="text-3xl font-mono font-black text-center bg-gray-600/10 border-gray-500/40 focus:border-gray-400 h-16 text-white tracking-widest"
                />
                {selectedDate && (
                  <div className="absolute -top-2 left-4 bg-gray-900 px-2 text-xs text-white font-sans font-bold tracking-wide">
                    CURRENT SELECTION
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="bg-gradient-to-r from-gray-900/95 via-black/95 to-gray-900/95 border-t border-gray-600 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-sans font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3 tracking-tight">
                <span className="font-mono">PREMIUM</span> Generator
              </h3>
              <p className="text-gray-300 text-sm font-sans font-medium leading-relaxed tracking-wide">
                Professional number and date generation with secure payment
                processing for premium users.
              </p>
            </div>

            <div className="flex flex-col gap-8 lg:gap-12">
              <div className="text-center">
                <h4 className="font-sans font-black text-white mb-4 text-xl tracking-wide">
                  <span className="font-mono">SECURITY</span>
                </h4>
                <div className="flex flex-col space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white">🔒</span>
                    <span className="font-sans font-bold tracking-wide">
                      SSL <span className="font-mono">ENCRYPTED</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-300">🛡️</span>
                    <span className="font-sans font-bold tracking-wide">
                      <span className="font-mono">PAYPAL</span> Protected
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white">✅</span>
                    <span className="font-sans font-bold tracking-wide">
                      Card <span className="font-mono">VALIDATION</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-600 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400 font-sans font-medium tracking-wide">
                © 2025 <span className="font-mono font-bold">Daysman Gad</span>.
                All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="hover:text-white transition-colors cursor-pointer font-sans font-bold tracking-wide">
                  <span className="font-mono">PRIVACY</span>
                </span>
                <span className="hover:text-yellow-400 transition-colors cursor-pointer font-sans font-bold tracking-wide">
                  <span className="font-mono">TERMS</span>
                </span>
                <span className="hover:text-white transition-colors cursor-pointer font-sans font-bold tracking-wide">
                  <span className="font-mono">SUPPORT</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
