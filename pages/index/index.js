Page({
  data: {
    token: '',
    authCode: '',
    scannedCode: null,
    isAuthenticated: false,
    showPayment: false,
    isLoadingLogin: false,
    isLoadingPay: false,
    toastVisible: false,
    toastMessage: '',
    toastType: 'success' // success | error
  },

  onLoad() {
    // Check if token exists in storage (optional persistence)
  },

  authenticate() {
    this.setData({ isLoadingLogin: true });

    my.getAuthCode({
      scopes: ['auth_base', 'USER_ID'],
      success: (res) => {
        this.exchangeAuthCode(res.authCode);
      },
      fail: (res) => {
        console.error('Auth failed', res);
        this.showToast('Auth failed: ' + JSON.stringify(res), 'error');
        this.setData({ isLoadingLogin: false });
      },
    });
  },

  exchangeAuthCode(code) {
    // Native Request
    my.request({
      url: 'https://its.mouamle.space/api/auth-with-superQi',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ token: code }),
      dataType: 'json',
      success: (res) => {
        if (res.data && res.data.token) {
          this.setData({
            token: res.data.token,
            authCode: code,
            isAuthenticated: true,
            isLoadingLogin: false
          });
          this.showToast('Welcome back!', 'success');
        } else {
          throw new Error('No token returned');
        }
      },
      fail: (err) => {
        console.error('API Error', err);
        this.showToast('Login server error', 'error');
        this.setData({ isLoadingLogin: false });
      }
    });
  },

  startScan() {
    my.scan({
      type: 'qr',
      success: (res) => {
        if (res.code) {
          this.setData({
            scannedCode: res.code,
            showPayment: true
          });
          // Scroll to payment (in native, we can't easily scrollIntoView like DOM, but we can render it)
        }
      },
      fail: (res) => {
        // scan cancelled or failed
      }
    });
  },

  cancelScan() {
    this.setData({
      scannedCode: null,
      showPayment: false
    });
  },

  processPayment() {
    if (!this.data.token || !this.data.scannedCode) return;

    this.setData({ isLoadingPay: true });

    my.request({
      url: 'https://its.mouamle.space/api/payment',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.data.token
      },
      data: JSON.stringify({ parkingId: this.data.scannedCode }),
      dataType: 'json',
      success: (res) => {
        const data = res.data;
        if (data && data.url) {
           this.initiateTradePay(data.url);
        } else {
           this.showToast('Invalid payment response', 'error');
           this.setData({ isLoadingPay: false });
        }
      },
      fail: () => {
        this.showToast('Payment connection failed', 'error');
        this.setData({ isLoadingPay: false });
      }
    });
  },

  initiateTradePay(url) {
     my.tradePay({
        paymentUrl: url, // Assuming this parameter is correct for the specific gateway/bridge
        success: (res) => {
             // result code handling
             if (res.resultCode === '9000') {
                 this.showToast('Payment Successful!', 'success');
                 this.cancelScan();
             } else {
                 this.showToast('Payment Pending or Failed', 'error');
             }
        },
        fail: (res) => {
             this.showToast('Payment Interface Failed', 'error');
        },
        complete: () => {
            this.setData({ isLoadingPay: false });
        }
    });
  },

  showToast(msg, type) {
    // Using native toast
    my.showToast({
      type: type === 'error' ? 'fail' : 'success',
      content: msg,
      duration: 3000
    });
  }
});
