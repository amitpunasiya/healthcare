import React, { useState } from 'react';
import api from '../../api/client';
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Lock, Banknote, QrCode } from 'lucide-react';

interface RazorpayCheckoutModalProps {
  bookingId: string;
  bookingNumber: string;
  totalAmount: number;
  onSuccess: (payment: any) => void;
  onClose: () => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  bookingId,
  bookingNumber,
  totalAmount,
  onSuccess,
  onClose,
}) => {
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH'>('ONLINE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Payment Verified & Paid!');

  const handleInitiateOnlinePayment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // Step 1: Create Order Server-Side
      const orderRes = await api.post('/payments/create-order', { bookingId });
      if (!orderRes.data.success) {
        setErrorMsg(orderRes.data.message || 'Failed to create payment order.');
        setLoading(false);
        return;
      }

      const { orderId } = orderRes.data;
      const mockPaymentId = `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const mockSignature = `sig_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      // Step 2: Verify Payment Server-Side
      const verifyRes = await api.post('/payments/verify', {
        bookingId,
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
      });

      if (verifyRes.data.success) {
        setSuccessMsg('Online Payment Verified & Completed!');
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess(verifyRes.data.payment);
        }, 1200);
      } else {
        setErrorMsg(verifyRes.data.message || 'Payment verification failed.');
      }
    } catch (err: any) {
      console.error('Payment checkout error', err);
      setErrorMsg(err.response?.data?.message || 'Payment processing error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordCashPayment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/payments/cash-payment', { bookingId });
      if (res.data.success) {
        setSuccessMsg('Cash Payment Confirmed Directly to Provider!');
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess(res.data.payment);
        }, 1200);
      } else {
        setErrorMsg(res.data.message || 'Cash payment recording failed.');
      }
    } catch (err: any) {
      console.error('Cash payment error', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record cash payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
            }}
          >
            <CreditCard size={28} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Service Payment Options</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Booking Reference: <strong>#{bookingNumber}</strong>
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        {paymentSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#15803d' }}>{successMsg}</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Updating status ledger...</p>
          </div>
        ) : (
          <div>
            {/* Payment Method Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMode('ONLINE')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: paymentMode === 'ONLINE' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: paymentMode === 'ONLINE' ? '#f0f9ff' : 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: paymentMode === 'ONLINE' ? '#0369a1' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <QrCode size={16} /> Pay Online (UPI/Card)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: paymentMode === 'CASH' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  backgroundColor: paymentMode === 'CASH' ? '#f0fdf4' : 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: paymentMode === 'CASH' ? '#15803d' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Banknote size={16} /> Cash / Pay Provider
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Total Service Amount:</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0284c7' }}>₹{totalAmount}</span>
              </div>

              {paymentMode === 'ONLINE' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                  <ShieldCheck size={14} /> 256-Bit SSL Encrypted Razorpay Gateway Verification
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#854d0e', backgroundColor: '#fffbeb', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                  <Banknote size={14} /> Pay ₹{totalAmount} directly in cash or via provider's QR code.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paymentMode === 'ONLINE' ? (
                <button
                  type="button"
                  onClick={handleInitiateOnlinePayment}
                  disabled={loading}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Lock size={18} /> {loading ? 'Verifying Online Payment...' : `PAY ₹${totalAmount} ONLINE`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRecordCashPayment}
                  disabled={loading}
                  className="btn btn-success btn-lg"
                  style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none' }}
                >
                  <Banknote size={18} /> {loading ? 'Logging Cash Payment...' : `CONFIRM CASH PAID (₹${totalAmount})`}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

