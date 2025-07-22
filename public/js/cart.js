// cart.js

// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart to localStorage
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Add item to cart
function addToCart(item) {
  const existing = cart.find((i) => i.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  alert(`${item.name} added to cart!`);
}

// Remove item from cart
function removeFromCart(itemId) {
  cart = cart.filter((item) => item.id !== itemId);
  saveCart();
  renderCart();
}

// Change quantity
function updateQuantity(itemId, quantity) {
  const item = cart.find((item) => item.id === itemId);
  if (item) {
    item.quantity = quantity;
    saveCart();
    renderCart();
  }
}

// Render cart page
function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (!container || !totalEl) return;

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.textContent = "$0.00";
    return;
  }

  let total = 0;
  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <p><strong>${item.name}</strong></p>
      <p>Price: $${item.price}</p>
      <p>
        Quantity: 
        <input type="number" min="1" value="${item.quantity}" data-id="${
      item.id
    }" class="quantity-input" />
      </p>
      <p>Subtotal: $${itemTotal.toFixed(2)}</p>
      <button class="remove-btn" data-id="${item.id}">Remove</button>
      <hr />
    `;
    container.appendChild(div);
  });

  totalEl.textContent = `$${total.toFixed(2)}`;

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      removeFromCart(id);
    });
  });

  document.querySelectorAll(".quantity-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const id = parseInt(input.dataset.id);
      const qty = parseInt(e.target.value);
      if (qty >= 1) updateQuantity(id, qty);
    });
  });
}

<script src="js/cart.js"></script>;
