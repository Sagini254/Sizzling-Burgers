// realtime-tracking.js
// Place this file in your frontend's JavaScript directory
// Include Socket.IO client library in your HTML: 
// <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.js"></script>

class OrderTracker {
    constructor(serverUrl = 'http://localhost:3000', token = null) {
      this.serverUrl = serverUrl;
      this.token = token || this.getStoredToken();
      this.socket = null;
      this.isConnected = false;
      this.currentOrderId = null;
      this.callbacks = {
        onStatusUpdate: [],
        onNotification: [],
        onConnect: [],
        onDisconnect: [],
        onError: []
      };
  
      this.init();
    }
  
    // Initialize socket connection
    init() {
      if (!this.token) {
        console.error('No authentication token provided');
        return;
      }
  
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.token
        },
        transports: ['websocket', 'polling']
      });
  
      this.setupEventListeners();
    }
  
    // Get token from localStorage or sessionStorage
    getStoredToken() {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
  
    // Setup socket event listeners
    setupEventListeners() {
      // Connection events
      this.socket.on('connect', () => {
        console.log('🔌 Connected to real-time tracking');
        this.isConnected = true;
        this.triggerCallbacks('onConnect');
      });
  
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from tracking:', reason);
        this.isConnected = false;
        this.triggerCallbacks('onDisconnect', reason);
      });
  
      this.socket.on('connected', (data) => {
        console.log('📱 Tracking service ready:', data);
      });
  
      // Order tracking events
      this.socket.on('order_status', (data) => {
        this.displayOrderStatus(data);
        this.triggerCallbacks('onStatusUpdate', data);
      });
  
      this.socket.on('order_status_updated', (data) => {
        this.displayStatusUpdate(data);
        this.triggerCallbacks('onStatusUpdate', data);
      });
  
      this.socket.on('order_notification', (notification) => {
        this.displayNotification(notification);
        this.triggerCallbacks('onNotification', notification);
      });
  
      this.socket.on('estimated_time_updated', (data) => {
        this.updateEstimatedTime(data);
      });
  
      this.socket.on('delivery_location_updated', (data) => {
        this.updateDeliveryLocation(data);
      });
  
      // Error handling
      this.socket.on('error', (error) => {
        console.error('❌ Tracking error:', error);
        this.triggerCallbacks('onError', error);
      });
  
      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.triggerCallbacks('onError', error);
      });
    }
  
    // Start tracking a specific order
    trackOrder(orderId) {
      if (!this.isConnected) {
        console.error('Not connected to tracking service');
        return false;
      }
  
      this.currentOrderId = orderId;
      this.socket.emit('track_order', { orderId });
      
      // Show tracking UI
      this.showTrackingInterface(orderId);
      return true;
    }
  
    // Stop tracking current order
    stopTracking() {
      if (this.currentOrderId && this.isConnected) {
        this.socket.emit('stop_tracking', { orderId: this.currentOrderId });
        this.currentOrderId = null;
        this.hideTrackingInterface();
      }
    }
  
    // Get user's orders
    getMyOrders() {
      if (this.isConnected) {
        this.socket.emit('get_my_orders');
        
        this.socket.once('my_orders', (orders) => {
          this.displayOrderHistory(orders);
        });
      }
    }
  
    // Display order status
    displayOrderStatus(data) {
      const statusContainer = document.getElementById('order-status');
      if (!statusContainer) return;
  
      const statusSteps = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const currentStepIndex = statusSteps.indexOf(data.status);
  
      statusContainer.innerHTML = `
        <div class="order-tracking">
          <div class="order-header">
            <h3>Order #${data.orderId}</h3>
            <p class="current-status">Status: <span class="status-${data.status}">${this.formatStatus(data.status)}</span></p>
            ${data.estimatedDelivery ? `<p class="eta">ETA: ${this.formatTime(data.estimatedDelivery)}</p>` : ''}
          </div>
          
          <div class="progress-bar">
            ${statusSteps.map((step, index) => `
              <div class="step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'current' : ''}">
                <div class="step-icon">${this.getStepIcon(step)}</div>
                <div class="step-label">${this.formatStatus(step)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="order-items">
            <h4>Order Items:</h4>
            <ul>
              ${data.items.map(item => `
                <li>${item.quantity}x ${item.name} - $${item.total.toFixed(2)}</li>
              `).join('')}
            </ul>
            <p class="total">Total: $${data.total.toFixed(2)}</p>
          </div>
        </div>
      `;
    }
  
    // Display status update notification
    displayStatusUpdate(data) {
      // Update existing status display
      this.displayOrderStatus(data);
  
      // Show notification
      this.showNotification({
        type: 'success',
        title: 'Order Status Updated',
        message: `Your order is now ${this.formatStatus(data.status)}`,
        duration: 5000
      });
  
      // Update browser title if page is not visible
      if (document.hidden) {
        document.title = `Order ${this.formatStatus(data.status)} - Sizzling Burgers`;
      }
    }
  
    // Display notification
    displayNotification(notification) {
      this.showNotification({
        type: notification.type || 'info',
        title: 'Order Update',
        message: notification.message,
        duration: 6000
      });
  
      // Play notification sound if enabled
      this.playNotificationSound();
    }
  
    // Update estimated delivery time
    updateEstimatedTime(data) {
      const etaElement = document.querySelector('.eta');
      if (etaElement) {
        etaElement.innerHTML = `ETA: ${this.formatTime(data.estimatedDelivery)}`;
      }
    }
  
    // Update delivery location (for map integration)
    updateDeliveryLocation(data) {
      console.log('🚚 Delivery location updated:', data.location);
      
      // If you have a map integration, update it here
      if (window.updateDeliveryMap) {
        window.updateDeliveryMap(data.location);
      }
  
      // Show location update notification
      this.showNotification({
        type: 'info',
        title: 'Delivery Update',
        message: `Your order is at: ${data.location.address}`,
        duration: 4000
      });
    }
  
    // Show tracking interface
    showTrackingInterface(orderId) {
      let trackingModal = document.getElementById('tracking-modal');
      
      if (!trackingModal) {
        trackingModal = document.createElement('div');
        trackingModal.id = 'tracking-modal';
        trackingModal.className = 'tracking-modal';
        document.body.appendChild(trackingModal);
      }
  
      trackingModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Order Tracking</h2>
            <button class="close-btn" onclick="orderTracker.stopTracking()">&times;</button>
          </div>
          <div id="order-status">
            <div class="loading">Loading order status...</div>
          </div>
          <div class="modal-actions">
            <button onclick="orderTracker.getMyOrders()">View All Orders</button>
            <button onclick="orderTracker.stopTracking()">Close Tracking</button>
          </div>
        </div>
      `;
  
      trackingModal.style.display = 'block';
    }
  
    // Hide tracking interface
    hideTrackingInterface() {
      const trackingModal = document.getElementById('tracking-modal');
      if (trackingModal) {
        trackingModal.style.display = 'none';
      }
    }
  
    // Display order history
    displayOrderHistory(orders) {
      const historyContainer = document.getElementById('order-history') || this.createOrderHistoryContainer();
      
      historyContainer.innerHTML = `
        <h3>Your Recent Orders</h3>
        <div class="orders-list">
          ${orders.map(order => `
            <div class="order-item" onclick="orderTracker.trackOrder(${order.id})">
              <div class="order-info">
                <h4>Order #${order.id}</h4>
                <p>Status: <span class="status-${order.status}">${this.formatStatus(order.status)}</span></p>
                <p>Total: $${order.total.toFixed(2)}</p>
                <p>Date: ${this.formatDate(order.createdAt)}</p>
              </div>
              <button class="track-btn">Track Order</button>
            </div>
          `).join('')}
        </div>
      `;
    }
  
    // Create order history container if it doesn't exist
    createOrderHistoryContainer() {
      const container = document.createElement('div');
      container.id = 'order-history';
      container.