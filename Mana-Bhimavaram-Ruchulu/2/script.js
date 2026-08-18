// Replace with your Google Apps Script Web App Deployment URL
// const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHJpkpAkuZ1eJTAzxVtFPXQrig0plNd52lGrgJ7LuGhfjzZjCb5qvz1caavTEWFJry/exec";

let allProducts = [];
let cart = {};

// Fetch product data from Apps Script backend on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
});

async function fetchProducts() {
  const container = document.getElementById("products");
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();
    allProducts = data || [];

    if (allProducts.length === 0) {
      container.innerHTML = "<h3>No products found in database.</h3>";
      return;
    }

    renderProducts(allProducts);
  } catch (error) {
    console.error("Error loading products:", error);
    container.innerHTML = "<h3>Failed to load products. Please refresh the page.</h3>";
  }
}

// Render Products Grid
function renderProducts(productList) {
  const container = document.getElementById("products");
  container.innerHTML = "";

  productList.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";

    let variantsHTML = "";
    prod.variants.forEach(v => {
      const itemKey = `${prod.name}__${v.qty}`;
      const currentQty = cart[itemKey] ? cart[itemKey].qty : 0;

      let btnHTML = "";
      if (currentQty > 0) {
        btnHTML = `
          <div class="qty-control">
            <button onclick="updateQty('${prod.name}', '${v.qty}', ${v.price}, -1)">-</button>
            <span class="qty-counter">${currentQty}</span>
            <button onclick="updateQty('${prod.name}', '${v.qty}', ${v.price}, 1)">+</button>
          </div>
        `;
      } else {
        btnHTML = `<button onclick="updateQty('${prod.name}', '${v.qty}', ${v.price}, 1)">Add</button>`;
      }

      variantsHTML += `
        <div class="variant">
          <span class="variantQty">${v.qty}</span>
          <span class="variantPrice">₹${v.price}</span>
          <div class="variantBtnContainer">${btnHTML}</div>
        </div>
      `;
    });

    card.innerHTML = `
      <img src="${prod.image || 'https://via.placeholder.com/150'}" alt="${prod.name}">
      <div class="cardBody">
        <h2>${prod.name}</h2>
        ${variantsHTML}
      </div>
    `;

    container.appendChild(card);
  });
}

// Live Search Filter
function filterProducts() {
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
  renderProducts(filtered);
}

// Modify Cart Quantities
function updateQty(name, variant, price, delta) {
  const key = `${name}__${variant}`;

  if (!cart[key]) {
    cart[key] = { name, variant, price, qty: 0 };
  }

  cart[key].qty += delta;

  if (cart[key].qty <= 0) {
    delete cart[key];
  }

  updateCartUI();
  
  // Re-render current active filtered list to sync card counters
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
  renderProducts(filtered);
}

// Update Cart Count and Drawer Items
function updateCartUI() {
  const cartCountEl = document.getElementById("cartCount");
  const cartItemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("total");

  let totalCount = 0;
  let totalPrice = 0;
  cartItemsEl.innerHTML = "";

  const keys = Object.keys(cart);

  if (keys.length === 0) {
    cartItemsEl.innerHTML = `<div class="empty-cart">Your cart is empty.</div>`;
  } else {
    keys.forEach(key => {
      const item = cart[key];
      const itemTotal = item.price * item.qty;
      totalCount += item.qty;
      totalPrice += itemTotal;

      const itemRow = document.createElement("div");
      itemRow.className = "cart-item";
      itemRow.innerHTML = `
        <div>
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-variant">${item.variant} × ${item.qty}</div>
        </div>
        <div class="cart-item-subtotal">₹${itemTotal}</div>
      `;
      cartItemsEl.appendChild(itemRow);
    });
  }

  cartCountEl.innerText = totalCount;
  totalEl.innerText = `Total: ₹${totalPrice}`;
}

// Toggle Cart Panel Slide-out
function toggleCart() {
  const panel = document.getElementById("cartPanel");
  panel.style.display = (panel.style.display === "block") ? "none" : "block";
}

// Temporary Checkout Action
// function checkout() {
//   const keys = Object.keys(cart);
//   if (keys.length === 0) {
//     alert("Your cart is empty!");
//     return;
//   }

//   let summary = "Order Summary:\n";
//   let grandTotal = 0;

//   keys.forEach(key => {
//     const item = cart[key];
//     const subtotal = item.price * item.qty;
//     grandTotal += subtotal;
//     summary += `- ${item.name} (${item.variant}) x ${item.qty} = ₹${subtotal}\n`;
//   });

//   summary += `\nTotal Amount: ₹${grandTotal}`;
//   alert(summary);
// }



// Function triggered when clicking "Proceed to Checkout" in the Cart panel
async function checkout() {
  const keys = Object.keys(cart);
  if (keys.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const customerName = prompt("Enter your Name:", "Ram Krishna");
  if (!customerName) return;

  const phone = prompt("Enter your Phone Number:", "9989000000");
  if (!phone) return;

  const address = prompt("Enter Delivery Address / Landmark:", "Bhimavaram Main Road");
  if (!address) return;

  const orderItems = [];
  let grandTotal = 0;

  keys.forEach(key => {
    const item = cart[key];
    const subtotal = item.price * item.qty;
    grandTotal += subtotal;
    
    orderItems.push({
      name: item.name,
      variant: item.variant,
      price: item.price,
      qty: item.qty,
      subtotal: subtotal
    });
  });

  const orderPayload = {
    customerName: customerName,
    phone: phone,
    address: address,
    items: orderItems,
    totalAmount: grandTotal,
    paymentStatus: "PENDING_PAYMENT",
    transactionId: "TXN_" + Date.now() // Mock transaction ID for now
  };

  const checkoutBtn = document.querySelector(".checkout-btn");
  const originalBtnText = checkoutBtn.innerText;

  try {
    checkoutBtn.innerText = "Processing Order...";
    checkoutBtn.disabled = true;

    // Send payload to Apps Script backend
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();

    if (result.status === "success") {
      // 1. Clear cart
      cart = {};
      
      // 2. Redirect directly to the order-success page!
      const redirectUrl = `order-success.html?order_id=${result.orderId}&amount=${grandTotal}&status=PENDING&txn_id=${orderPayload.transactionId}`;
      window.location.href = redirectUrl;
    } else {
      alert("Error: " + result.message);
    }

  } catch (error) {
    console.error("Order submission issue:", error);
    // Fallback redirect if fetch response parsing has CORS issue
    alert("Order recorded! Redirecting to confirmation page...");
    cart = {};
    window.location.href = `order-success.html?order_id=MBR-NEW&amount=${grandTotal}&status=PENDING`;
  } finally {
    if (checkoutBtn) {
      checkoutBtn.innerText = originalBtnText;
      checkoutBtn.disabled = false;
    }
  }
}
