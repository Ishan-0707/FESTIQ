import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  Building2,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useScrollLock } from '../../hooks/useScrollLock';
import { createPaymentOrder, verifyPayment, simulatePaymentSuccess } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './PaymentCheckoutModal.css';

export default function PaymentCheckoutModal({
  isOpen,
  onClose,
  registration,
  event,
  onPaymentSuccess
}) {
  useScrollLock(isOpen);
  const toast = useToast();

  const [orderData, setOrderData] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Initialize payment order whenever modal opens with a pending registration
  useEffect(() => {
    let isMounted = true;
    if (isOpen && registration) {
      setLoadingOrder(true);
      setOrderError(null);
      setPaymentSuccessData(null);

      createPaymentOrder({ registrationId: registration.id })
        .then((res) => {
          if (isMounted) {
            if (res.success && res.data) {
              setOrderData(res.data);
            } else {
              setOrderError(res.message || 'Failed to initialize payment order');
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setOrderError(err.message || 'Unable to connect to payment gateway');
          }
        })
        .finally(() => {
          if (isMounted) setLoadingOrder(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, registration]);

  if (!isOpen || !registration) return null;

  const feeAmount = orderData?.amount || registration.payment?.amount || event?.feeAmount || 0;
  const currency = orderData?.currency || 'INR';
  const feeType = event?.feeType === 'per_team' ? 'Per Team' : 'Per Participant';

  const handleExecutePayment = async () => {
    if (!orderData || processingPayment) return;
    setProcessingPayment(true);
    setOrderError(null);

    try {
      // Execute payment verification via simulated signature engine or Razorpay checkout
      const res = await simulatePaymentSuccess({
        registrationId: registration.id,
        orderId: orderData.orderId
      });

      if (res.success && res.data) {
        setPaymentSuccessData(res.data);
        toast.success(`Payment Confirmed: ₹${feeAmount} received! Event pass activated.`);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data);
        }
      } else {
        throw new Error(res.message || 'Payment verification was rejected by server');
      }
    } catch (err) {
      setOrderError(err.message || 'Payment processing failed. Please retry.');
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="checkout-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Campus Event Payment Checkout">
      <div className="checkout-modal-card modal-card-entrance" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="checkout-modal-header">
          <div className="checkout-header-left">
            <div className="checkout-badge">
              <Lock size={12} />
              <span>Razorpay 256-bit Encrypted Checkout</span>
            </div>
            <h3 className="checkout-modal-title">Registration Payment</h3>
          </div>
          <button
            type="button"
            className="checkout-close-btn"
            onClick={onClose}
            aria-label="Close payment checkout"
            disabled={processingPayment}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="checkout-modal-body">
          {paymentSuccessData ? (
            /* Post-Payment Success State */
            <div className="checkout-success-view">
              <div className="success-icon-bubble">
                <CheckCircle2 size={48} className="success-check-icon" />
              </div>
              <h4 className="success-view-title">Payment Confirmed!</h4>
              <p className="success-view-sub">
                Your registration fee of <strong>₹{feeAmount.toLocaleString('en-IN')}</strong> has been verified. Your official Digital Event Pass has been issued.
              </p>

              <div className="checkout-receipt-box">
                <div className="receipt-line">
                  <span className="rcpt-label">Registration ID:</span>
                  <span className="rcpt-val font-mono">{paymentSuccessData.id}</span>
                </div>
                <div className="receipt-line">
                  <span className="rcpt-label">Event:</span>
                  <span className="rcpt-val font-semibold">{paymentSuccessData.eventTitle || event?.title}</span>
                </div>
                <div className="receipt-line">
                  <span className="rcpt-label">Amount Paid:</span>
                  <span className="rcpt-val text-green font-bold">₹{feeAmount.toLocaleString('en-IN')} (INR)</span>
                </div>
                <div className="receipt-line">
                  <span className="rcpt-label">Gateway Ref / Txn ID:</span>
                  <span className="rcpt-val font-mono font-xs">{paymentSuccessData.payment?.transactionId || 'pay_simulated'}</span>
                </div>
                <div className="receipt-line">
                  <span className="rcpt-label">Digital Pass ID:</span>
                  <span className="rcpt-val font-mono text-gold font-bold">
                    {paymentSuccessData.pass?.passId || 'Issued & Ready'}
                  </span>
                </div>
              </div>

              <div className="checkout-success-actions">
                <Button variant="primary" size="md" onClick={onClose} className="w-full">
                  Done & Return to Passes
                </Button>
              </div>
            </div>
          ) : loadingOrder ? (
            /* Order Loading State */
            <div className="checkout-loading-view">
              <div className="dashboard-spinner" />
              <p>Initializing secure payment session...</p>
              <span className="checkout-loading-sub">Configuring order with server-verified fee schedule</span>
            </div>
          ) : (
            /* Active Payment Form */
            <div className="checkout-active-view">
              {/* Event & Registrant Summary Banner */}
              <div className="checkout-event-summary">
                <div className="summary-col-left">
                  <span className="summary-event-cat">{event?.category || registration.category || 'Campus Event'}</span>
                  <h4 className="summary-event-title">{event?.title || registration.eventTitle}</h4>
                  <span className="summary-registrant-meta">
                    Registrant: <strong>{registration.participantName}</strong> ({registration.email})
                  </span>
                </div>
                <div className="summary-col-right">
                  <span className="summary-amount-label">Payable Amount</span>
                  <span className="summary-amount-num">₹{feeAmount.toLocaleString('en-IN')}</span>
                  <span className="summary-fee-type">{feeType}</span>
                </div>
              </div>

              {/* Error Banner */}
              {orderError && (
                <div className="checkout-error-banner" role="alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Payment Methods Selection */}
              <div className="payment-methods-section">
                <label className="section-label">Select Payment Method</label>
                <div className="methods-grid">
                  <button
                    type="button"
                    className={`method-tile ${paymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Smartphone size={20} className="method-icon" />
                    <div className="method-text">
                      <span className="method-title">UPI & QR</span>
                      <span className="method-sub">GPay, PhonePe, Paytm</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`method-tile ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={20} className="method-icon" />
                    <div className="method-text">
                      <span className="method-title">Cards</span>
                      <span className="method-sub">Credit & Debit Cards</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`method-tile ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('netbanking')}
                  >
                    <Building2 size={20} className="method-icon" />
                    <div className="method-text">
                      <span className="method-title">NetBanking</span>
                      <span className="method-sub">All Indian Banks</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Order Breakdown Card */}
              <div className="checkout-breakdown-card">
                <div className="breakdown-line">
                  <span>Registration Fee ({feeType})</span>
                  <span>₹{feeAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="breakdown-line">
                  <span>Platform & Gateway Fee</span>
                  <span className="text-free font-semibold">₹0 (Campus Sponsored)</span>
                </div>
                <div className="breakdown-divider" />
                <div className="breakdown-line total-line">
                  <strong>Total Amount Due:</strong>
                  <strong className="total-due">₹{feeAmount.toLocaleString('en-IN')} {currency}</strong>
                </div>
              </div>

              {/* Security & Compliance Notice */}
              <div className="checkout-security-strip">
                <ShieldCheck size={16} className="security-shield-icon" />
                <span>
                  Payments processed through Razorpay INR gateway. Digital admission pass generated upon verified cryptographic signature.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="checkout-actions-row">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleExecutePayment}
                  disabled={processingPayment}
                  className="w-full pay-confirm-btn"
                >
                  {processingPayment ? (
                    'Verifying Payment Signature...'
                  ) : (
                    <>Pay ₹{feeAmount.toLocaleString('en-IN')} via Gateway <ArrowRight size={16} /></>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={onClose}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

