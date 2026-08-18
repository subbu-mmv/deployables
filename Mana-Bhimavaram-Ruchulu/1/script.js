// Replace this with your Google Apps Script Web App URL
// const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
// const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEtvN--PO69oQnEfYfRIVmbeFTheUzsbi2syyTb5lS/dev";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHJpkpAkuZ1eJTAzxVtFPXQrig0plNd52lGrgJ7LuGhfjzZjCb5qvz1caavTEWFJry/exec";

let allProducts = [];
let cart = {};

document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
});

// Fetch product data from Apps Script backend
async function fetchProducts() {
  const productsContainer = document.getElementById("products");
  
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();
    allProducts = data || [];

    if (allProducts.length === 0) {
      productsContainer.innerHTML = "<p class='loading-state'>No products found.</p>";
      return;
    }

    renderProducts(allProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    productsContainer.innerHTML = "<p class='loading-state'>Failed to load products. Check APPS_SCRIPT_URL.</p>";
  }
}

// Render product cards
function renderProducts(products) {
  const container = document.getElementById("products");
  container.innerHTML = "";

  products.forEach(prod => {
    const card = document.createElement("div");
    card.className = "card";

    let variantsHtml = "";
    prod.variants.forEach(v => {
      const itemKey = `${prod.name}_${v.quantity}`;
      const qty = cart[itemKey] ? cart[itemKey].qty : 0;

      let btnMarkup = "";
      if (qty === 0) {
        btnMarkup = `<button onclick="addToCart('${prod.name}', '${v.quantity}', ${v.price})">ADD</button>`;
      } else {
        btnMarkup = `
          <div class="qty-control">
            <button onclick="updateQty('${itemKey}', -1)">-</button>
            <span class="qty-counter">${qty}</span>
            <button onclick="updateQty('${itemKey}', 1)">+</button>
          </div>
        `;
      }

      variantsHtml += `
        <div class="variant">
          <span class="variantQty">${v.quantity}</span>
          <span class="variantPrice">₹${v.price}</span>
          <div class="variantBtnContainer" id="btn_${itemKey}">
            ${btnMarkup}
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <img src="${prod.imageUrl || 'https://via.placeholder.com/300x200?text=Food+Image'}" alt="${prod.name}">
      <div class="cardBody">
        <h2>${prod.name}</h2>
        ${variantsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

// Search Filter
function filterProducts() {
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
  renderProducts(filtered);
}

// Cart Logic
function addToCart(name, variant, price) {
  const key = `${name}_${variant}`;
  cart[key] = { name, variant, price, qty: 1 };
  updateCartUI();
  renderProducts(allProducts);
}

function updateQty(key, delta) {
  if (cart[key]) {
    cart[key].qty += delta;
    if (cart[key].qty <= 0) {
      delete cart[key];
    }
  }
  updateCartUI();
  renderProducts(allProducts);
}

function updateCartUI() {
  let totalCount = 0;
  let totalPrice = 0;
  const cartItemsDiv = document.getElementById("cartItems");
  cartItemsDiv.innerHTML = "";

  const keys = Object.keys(cart);
  if (keys.length === 0) {
    cartItemsDiv.innerHTML = "<p class='loading-state'>Your cart is empty.</p>";
  } else {
    keys.forEach(key => {
      const item = cart[key];
      const itemSubtotal = item.price * item.qty;
      totalCount += item.qty;
      totalPrice += itemSubtotal;

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";
      itemDiv.innerHTML = `
        <div>
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-variant">${item.variant} × ${item.qty}</div>
        </div>
        <div class="cart-item-subtotal">₹${itemSubtotal}</div>
      `;
      cartItemsDiv.appendChild(itemDiv);
    });
  }

  document.getElementById("cartCount").innerText = totalCount;
  document.getElementById("total").innerText = `Total ₹${totalPrice}`;
}

function openCart() {
  document.getElementById("cartPanel").style.display = "block";
}

function closeCart() {
  document.getElementById("cartPanel").style.display = "none";
}

// Placeholder Checkout (Will lead to payment link in future steps)
function checkout() {
  const keys = Object.keys(cart);
  if (keys.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  let summary = "Order Summary:\n";
  let grandTotal = 0;

  keys.forEach(key => {
    const item = cart[key];
    const subtotal = item.price * item.qty;
    grandTotal += subtotal;
    summary += `- ${item.name} (${item.variant}) x ${item.qty} = ₹${subtotal}\n`;
  });

  summary += `\nTotal Amount: ₹${grandTotal}`;
  alert(summary + "\n\n(Checkout feature clicked! Ready to connect payment gateway next.)");
}

