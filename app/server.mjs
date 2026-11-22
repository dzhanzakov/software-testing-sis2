// A small, zero-dependency stand-in for the Toolshop (practicesoftwaretesting.com).
//
// Why it exists: GitHub Actions runners use datacenter IPs, and the public site answers them with a
// Cloudflare "Performing security verification" page instead of the app, so the suite cannot run
// against it from CI. This server reproduces the pages and flows the tests use, with the same
// data-test attributes and API paths, so CI can run the full suite against http://localhost:3000.
//
// Everything is kept in memory: each `node app/server.mjs` starts with an empty user list.
//
//   node app/server.mjs            # http://localhost:3000
//   PORT=4000 node app/server.mjs

import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

/** The first product is out of stock on purpose, so tests must not rely on a fixed index to buy. */
const PRODUCTS = [
  { id: 'p1', name: 'Combination Pliers', price: 14.15, inStock: false, description: 'Pliers with insulated handles.' },
  { id: 'p2', name: 'Pliers', price: 12.01, inStock: true, description: 'General purpose pliers.' },
  { id: 'p3', name: 'Bolt Cutters', price: 48.41, inStock: true, description: 'Cuts bolts up to 8 mm.' },
  { id: 'p4', name: 'Long Nose Pliers', price: 14.24, inStock: true, description: 'For tight spaces.' },
  { id: 'p5', name: 'Slip Joint Pliers', price: 9.17, inStock: true, description: 'Adjustable jaw width.' },
  { id: 'p6', name: 'Claw Hammer with Shock Reduction Grip', price: 13.41, inStock: true, description: 'Fibreglass handle.' },
  { id: 'p7', name: 'Hammer', price: 12.58, inStock: true, description: 'Steel head, wooden handle.' },
  { id: 'p8', name: 'Thor Hammer', price: 11.14, inStock: true, description: 'Heavy and dependable.' },
  { id: 'p9', name: 'Wood Saw', price: 12.18, inStock: true, description: 'For cutting timber.' },
];

const COUNTRIES = [
  ['US', 'United States of America'],
  ['NL', 'Netherlands'],
  ['DE', 'Germany'],
  ['GB', 'United Kingdom'],
  ['KZ', 'Kazakhstan'],
];

/** email -> user */
const users = new Map();
/** token -> email */
const sessions = new Map();
let invoiceCounter = 0;

// ---------------------------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------------------------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const money = (n) => `$${n.toFixed(2)}`;

const countryOptions = () =>
  `<option value="">Your country *</option>` +
  COUNTRIES.map(([code, name]) => `<option value="${code}">${esc(name)}</option>`).join('');

const STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #222; background: #f6f6f6; }
  nav { display: flex; gap: 16px; align-items: center; padding: 12px 24px; background: #fff; border-bottom: 1px solid #ddd; }
  nav .brand { font-weight: 700; margin-right: auto; color: #222; text-decoration: none; }
  nav a { color: #0b5ed7; text-decoration: none; }
  main { max-width: 960px; margin: 24px auto; padding: 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .card { display: block; padding: 16px; background: #fff; border: 1px solid #ddd; border-radius: 6px; color: inherit; text-decoration: none; }
  .card:hover { border-color: #0b5ed7; }
  .badge { display: inline-block; padding: 0 6px; border-radius: 4px; background: #dc3545; color: #fff; font-size: 12px; }
  form, .panel { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 16px; }
  label { display: block; margin-top: 10px; font-weight: 600; }
  input, select { width: 100%; padding: 6px 8px; margin-top: 4px; font: inherit; }
  button { margin-top: 14px; padding: 8px 16px; font: inherit; background: #0b5ed7; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
  button:disabled { background: #999; cursor: not-allowed; }
  .error { color: #b02a37; margin-top: 6px; }
  .success { color: #146c43; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 6px; border-bottom: 1px solid #eee; text-align: left; }
  td input { width: 80px; }
`;

function layout(title, body, script = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - Toolshop (local)</title>
<style>${STYLE}</style>
</head>
<body>
<nav>
  <a class="brand" href="/">Toolshop</a>
  <a data-test="nav-home" href="/">Home</a>
  <span id="nav-user"><a data-test="nav-sign-in" href="/auth/login">Sign in</a></span>
  <a data-test="nav-cart" href="/checkout">Cart <span data-test="cart-quantity" hidden></span></a>
</nav>
<main>${body}</main>
<script>(${clientCommon})();</script>
${script ? `<script>(${script})();</script>` : ''}
</body>
</html>`;
}

// ---- Client-side code (serialised with Function.prototype.toString, so it must be self-contained) ----

function clientCommon() {
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    },
  };

  async function api(path, body) {
    const token = store.get('token', null);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch('/api' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }

  function renderNav() {
    const items = store.get('cart', []);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const badge = document.querySelector('[data-test="cart-quantity"]');
    badge.textContent = String(count);
    badge.hidden = count === 0;

    const user = store.get('user', null);
    const slot = document.getElementById('nav-user');
    if (user) {
      slot.innerHTML = '<a data-test="nav-menu" href="/account"></a> <a data-test="nav-sign-out" href="#">Sign out</a>';
      slot.querySelector('[data-test="nav-menu"]').textContent = user.first_name + ' ' + user.last_name;
      slot.querySelector('[data-test="nav-sign-out"]').addEventListener('click', (e) => {
        e.preventDefault();
        store.remove('token');
        store.remove('user');
        location.href = '/';
      });
    }
  }

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  window.shop = { store, api, renderNav, isEmail };
  renderNav();
}

function productClient() {
  const { store, renderNav } = window.shop;
  const root = document.getElementById('product');
  const product = JSON.parse(root.dataset.product);
  const button = document.querySelector('[data-test="add-to-cart"]');
  button.addEventListener('click', () => {
    const quantity = Math.max(1, parseInt(document.querySelector('[data-test="quantity"]').value, 10) || 1);
    const cart = store.get('cart', []);
    const line = cart.find((i) => i.id === product.id);
    if (line) line.quantity += quantity;
    else cart.push({ id: product.id, name: product.name, price: product.price, quantity });
    store.set('cart', cart);
    renderNav();
    document.getElementById('added').hidden = false;
  });
}

function loginClient() {
  const { store, api, isEmail } = window.shop;
  const form = document.querySelector('[data-test="login-form"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    const emailError = document.querySelector('[data-test="email-error"]');
    const loginError = document.querySelector('[data-test="login-error"]');
    emailError.hidden = isEmail(email);
    loginError.hidden = true;
    if (!isEmail(email)) return;

    const res = await api('/users/login', { email, password });
    if (!res.ok) {
      loginError.textContent = 'Invalid email or password';
      loginError.hidden = false;
      return;
    }
    store.set('token', res.data.access_token);
    store.set('user', res.data.user);
    location.href = '/account';
  });
}

function accountClient() {
  const { store } = window.shop;
  const user = store.get('user', null);
  if (!store.get('token', null) || !user) {
    location.href = '/auth/login';
    return;
  }
  document.getElementById('greeting').textContent =
    'Here you can manage your profile, favorites and orders, ' + user.first_name + '.';
}

function registerClient() {
  const { api } = window.shop;
  const form = document.querySelector('[data-test="register-form"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (name) => form.elements[name].value.trim();
    const res = await api('/users/register', {
      first_name: v('first_name'),
      last_name: v('last_name'),
      dob: v('dob'),
      phone: v('phone'),
      email: v('email'),
      password: form.elements.password.value,
      address: {
        street: v('street'),
        house_number: v('house_number'),
        city: v('city'),
        state: v('state'),
        country: v('country'),
        postal_code: v('postal_code'),
      },
    });
    if (res.ok) {
      location.href = '/auth/login';
      return;
    }
    const box = document.getElementById('register-error-slot');
    box.innerHTML = '<div class="error" data-test="register-error"></div>';
    box.firstChild.textContent = res.data.message || 'Registration failed';
  });
}

function forgotPasswordClient() {
  const { api, isEmail } = window.shop;
  const form = document.querySelector('[data-test="forgot-password-form"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const emailError = document.querySelector('[data-test="email-error"]');
    const slot = document.getElementById('confirmation-slot');
    slot.innerHTML = '';
    emailError.hidden = isEmail(email);
    if (!isEmail(email)) return;

    const res = await api('/users/forgot-password', { email });
    if (res.ok) {
      slot.innerHTML =
        '<div role="alert" class="success">Your password reset request has been sent. Please check your email.</div>';
    } else {
      slot.innerHTML = '<div role="alert" class="error"></div>';
      slot.firstChild.textContent = res.data.message || 'Request failed';
    }
  });
}

/** The checkout wizard: 1 cart, 2 sign in, 3 billing address, 4 payment. Only the current step is in the DOM. */
function checkoutClient() {
  const { store, api, renderNav, isEmail } = window.shop;
  const root = document.getElementById('wizard');
  const countryOptions = root.dataset.countries;
  const money = (n) => '$' + n.toFixed(2);
  let address = null;

  const h = (html) => { root.innerHTML = html; };
  const $ = (sel) => root.querySelector(sel);

  function stepCart() {
    const cart = store.get('cart', []);
    if (cart.length === 0) {
      h('<div class="panel"><h2>Cart</h2><p data-test="cart-empty">The cart is empty. Nothing to display.</p></div>');
      return;
    }
    const rows = cart.map((i, idx) =>
      '<tr><td><span data-test="product-title"></span></td>' +
      '<td><input data-test="product-quantity" type="number" min="1" data-idx="' + idx + '" value="' + i.quantity + '"></td>' +
      '<td data-test="product-price">' + money(i.price) + '</td>' +
      '<td data-test="line-price">' + money(i.price * i.quantity) + '</td></tr>').join('');
    h('<div class="panel"><h2>Cart</h2><table><thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p>Total: <strong data-test="cart-total"></strong></p>' +
      '<button data-test="proceed-1">Proceed to checkout</button></div>');
    root.querySelectorAll('[data-test="product-title"]').forEach((el, idx) => { el.textContent = cart[idx].name; });
    const total = () => store.get('cart', []).reduce((s, i) => s + i.price * i.quantity, 0);
    $('[data-test="cart-total"]').textContent = money(total());
    root.querySelectorAll('[data-test="product-quantity"]').forEach((input) => {
      input.addEventListener('change', () => {
        const c = store.get('cart', []);
        c[Number(input.dataset.idx)].quantity = Math.max(1, parseInt(input.value, 10) || 1);
        store.set('cart', c);
        renderNav();
        stepCart();
      });
    });
    $('[data-test="proceed-1"]').addEventListener('click', stepSignIn);
  }

  function stepSignIn() {
    const user = store.get('user', null);
    if (store.get('token', null) && user) {
      h('<div class="panel"><h2>Sign in</h2><p id="signed-in"></p><button data-test="proceed-2">Proceed to checkout</button></div>');
      $('#signed-in').textContent = 'Hello ' + user.first_name + ' ' + user.last_name + ', you are already logged in. You can proceed to checkout.';
      $('[data-test="proceed-2"]').addEventListener('click', stepAddress);
      return;
    }
    h('<form data-test="login-form" novalidate><h2>Sign in</h2>' +
      '<label for="email">Email address *</label><input id="email" name="email" data-test="email" type="email">' +
      '<div class="error" data-test="email-error" hidden>Email format is invalid</div>' +
      '<label for="password">Password *</label><input id="password" name="password" data-test="password" type="password">' +
      '<div class="error" data-test="login-error" hidden></div>' +
      '<button type="submit" data-test="login-submit">Login</button></form>');
    const form = $('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      $('[data-test="email-error"]').hidden = isEmail(email);
      if (!isEmail(email)) return;
      const res = await api('/users/login', { email, password: form.password.value });
      if (!res.ok) {
        const err = $('[data-test="login-error"]');
        err.textContent = 'Invalid email or password';
        err.hidden = false;
        return;
      }
      store.set('token', res.data.access_token);
      store.set('user', res.data.user);
      renderNav();
      stepSignIn();
    });
  }

  function stepAddress() {
    const field = (name, label) =>
      '<label for="' + name + '">' + label + ' *</label><input id="' + name + '" name="' + name + '" data-test="' + name + '">';
    h('<form novalidate><h2>Billing Address</h2>' +
      '<label for="country">Country *</label><select id="country" name="country" data-test="country">' + countryOptions + '</select>' +
      field('street', 'Street') + field('city', 'City') + field('state', 'State') +
      field('postal_code', 'Postal code') + field('house_number', 'House number') +
      '<div class="error" id="address-error" hidden>All fields are required</div>' +
      '<button type="submit" data-test="proceed-3">Proceed to checkout</button></form>');
    const form = $('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const names = ['country', 'street', 'city', 'state', 'postal_code', 'house_number'];
      const values = Object.fromEntries(names.map((n) => [n, form.elements[n].value.trim()]));
      if (names.some((n) => !values[n])) {
        $('#address-error').hidden = false;
        return;
      }
      address = values;
      stepPayment();
    });
  }

  function stepPayment() {
    h('<div class="panel"><h2>Payment</h2>' +
      '<label for="payment-method">Payment method *</label>' +
      '<select id="payment-method" data-test="payment-method">' +
      '<option value="">Choose your payment method</option>' +
      '<option value="bank-transfer">Bank Transfer</option>' +
      '<option value="cash-on-delivery">Cash on Delivery</option>' +
      '<option value="credit-card">Credit Card</option>' +
      '<option value="buy-now-pay-later">Buy Now Pay Later</option>' +
      '<option value="gift-card">Gift Card</option></select>' +
      '<div id="payment-slot"></div>' +
      '<button data-test="finish">Confirm</button></div>');
    let validated = false;
    const finish = $('[data-test="finish"]');
    const slot = $('#payment-slot');
    $('[data-test="payment-method"]').addEventListener('change', () => { validated = false; slot.innerHTML = ''; });
    finish.addEventListener('click', async () => {
      const method = $('[data-test="payment-method"]').value;
      if (!method) {
        slot.innerHTML = '<div class="error">Please choose a payment method</div>';
        return;
      }
      if (!validated) {
        validated = true;
        slot.innerHTML = '<div class="success" data-test="payment-success-message">Payment was successful</div>';
        return;
      }
      finish.disabled = true;
      const cart = store.get('cart', []);
      const res = await api('/invoices', {
        billing_street: address.street,
        billing_house_number: address.house_number,
        billing_city: address.city,
        billing_state: address.state,
        billing_country: address.country,
        billing_postal_code: address.postal_code,
        payment_method: method,
        cart: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      if (!res.ok) {
        finish.disabled = false;
        slot.innerHTML = '<div class="error"></div>';
        slot.firstChild.textContent = res.data.message || 'Could not place the order';
        return;
      }
      store.set('cart', []);
      renderNav();
      h('<div class="panel" id="order-confirmation"></div>');
      $('#order-confirmation').textContent =
        'Thanks for your order! Your invoice number is ' + res.data.invoice_number + '.';
    });
  }

  stepCart();
}

// ---- Pages ----

function catalogPage() {
  const cards = PRODUCTS.map((p) => `
    <a class="card" href="/product/${p.id}">
      <h3 data-test="product-name">${esc(p.name)}</h3>
      <div data-test="product-price">${money(p.price)}</div>
      ${p.inStock ? '' : '<span class="badge" data-test="out-of-stock">Out of stock</span>'}
    </a>`).join('');
  return layout('Catalogue', `<h1>Products</h1><div class="grid">${cards}</div>`);
}

function productPage(p) {
  const body = `
    <div class="panel" id="product" data-product="${esc(JSON.stringify(p))}">
      <h1 data-test="product-name">${esc(p.name)}</h1>
      <p>Price: <span data-test="unit-price">${p.price.toFixed(2)}</span></p>
      <p data-test="product-description">${esc(p.description)}</p>
      ${p.inStock ? '' : '<p class="badge" data-test="out-of-stock">Out of stock</p>'}
      <label for="quantity">Quantity</label>
      <input id="quantity" data-test="quantity" type="number" min="1" value="1">
      <button data-test="add-to-cart" ${p.inStock ? '' : 'disabled'}>Add to cart</button>
      <p class="success" id="added" role="status" hidden>Product added to shopping cart.</p>
    </div>`;
  return layout(p.name, body, productClient);
}

function loginPage() {
  const body = `
    <h1>Login</h1>
    <form data-test="login-form" novalidate>
      <label for="email">Email address *</label>
      <input id="email" name="email" data-test="email" type="email" autocomplete="username">
      <div class="error" data-test="email-error" hidden>Email format is invalid</div>
      <label for="password">Password *</label>
      <input id="password" name="password" data-test="password" type="password" autocomplete="current-password">
      <div class="error" data-test="login-error" hidden></div>
      <button type="submit" data-test="login-submit">Login</button>
      <p><a data-test="register-link" href="/auth/register">Register your account</a> ·
         <a data-test="forgot-password-link" href="/auth/forgot-password">Forgot your password?</a></p>
    </form>`;
  return layout('Login', body, loginClient);
}

function accountPage() {
  return layout('My account', `<h1 data-test="page-title">My account</h1><p id="greeting"></p>`, accountClient);
}

function registerPage() {
  const field = (name, label, type = 'text', testId = name.replace(/_/g, '-')) =>
    `<label for="${name}">${label} *</label><input id="${name}" name="${name}" data-test="${testId}" type="${type}">`;
  const body = `
    <h1>Customer registration</h1>
    <form data-test="register-form" novalidate>
      ${field('first_name', 'First name')}
      ${field('last_name', 'Last name')}
      ${field('dob', 'Date of Birth', 'date')}
      ${field('street', 'Street')}
      ${field('postal_code', 'Postal code', 'text', 'postal_code')}
      ${field('house_number', 'House number', 'text', 'house_number')}
      ${field('city', 'City')}
      ${field('state', 'State')}
      <label for="country">Country *</label>
      <select id="country" name="country" data-test="country">${countryOptions()}</select>
      ${field('phone', 'Phone', 'tel')}
      ${field('email', 'Email address', 'email')}
      ${field('password', 'Password', 'password')}
      <div id="register-error-slot"></div>
      <button type="submit" data-test="register-submit">Register</button>
    </form>`;
  return layout('Register', body, registerClient);
}

function forgotPasswordPage() {
  const body = `
    <h1>Forgot Password</h1>
    <form data-test="forgot-password-form" novalidate>
      <label for="email">Email address *</label>
      <input id="email" name="email" data-test="email" type="email">
      <div class="error" data-test="email-error" hidden>Email format is invalid</div>
      <button type="submit" data-test="forgot-password-submit">Set New Password</button>
      <div id="confirmation-slot"></div>
    </form>`;
  return layout('Forgot password', body, forgotPasswordClient);
}

function checkoutPage() {
  return layout('Checkout', `<div id="wizard" data-countries="${esc(countryOptions())}"></div>`, checkoutClient);
}

// ---------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ first_name: u.first_name, last_name: u.last_name, email: u.email });

function authUser(req) {
  const m = /^Bearer (\w+)$/.exec(req.headers.authorization || '');
  const email = m && sessions.get(m[1]);
  return email ? users.get(email) : null;
}

const api = {
  'POST /users/register'(body) {
    const a = body.address || {};
    const required = { first_name: body.first_name, last_name: body.last_name, dob: body.dob, email: body.email,
      password: body.password, street: a.street, city: a.city, state: a.state, country: a.country, postal_code: a.postal_code };
    const missing = Object.entries(required).filter(([, v]) => !v || !String(v).trim()).map(([k]) => k);
    if (missing.length) return [422, { message: `Missing fields: ${missing.join(', ')}` }];
    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return [422, { message: 'The email field must be a valid email address.' }];
    if (String(body.password).length < 8) return [422, { message: 'The password field must be at least 8 characters.' }];
    if (users.has(email)) return [422, { message: 'A customer with this email address already exists.' }];
    const user = { ...body, email, address: a };
    users.set(email, user);
    return [201, publicUser(user)];
  },

  'POST /users/login'(body) {
    const user = users.get(String(body.email || '').trim().toLowerCase());
    if (!user || user.password !== body.password) return [401, { error: 'Unauthorized' }];
    const token = randomBytes(16).toString('hex');
    sessions.set(token, user.email);
    return [200, { access_token: token, token_type: 'bearer', user: publicUser(user) }];
  },

  'GET /users/me'(_body, req) {
    const user = authUser(req);
    return user ? [200, publicUser(user)] : [401, { message: 'Unauthorized' }];
  },

  'POST /users/forgot-password'(body) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return [422, { message: 'The email field must be a valid email address.' }];
    if (!users.has(email)) return [404, { message: 'No account with this email address.' }];
    return [200, { success: true }];
  },

  'POST /invoices'(body, req) {
    if (!authUser(req)) return [401, { message: 'Unauthorized' }];
    const fields = ['billing_street', 'billing_city', 'billing_state', 'billing_country', 'billing_postal_code', 'payment_method'];
    const missing = fields.filter((f) => !body[f]);
    if (missing.length) return [422, { message: `Missing fields: ${missing.join(', ')}` }];
    if (!Array.isArray(body.cart) || body.cart.length === 0) return [422, { message: 'The cart is empty.' }];
    invoiceCounter += 1;
    return [201, { id: String(invoiceCounter), invoice_number: `INV-2026${String(invoiceCounter).padStart(6, '0')}` }];
  },

  'GET /products'() {
    return [200, { data: PRODUCTS }];
  },
};

// ---------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(null); } });
  });
}

const pages = {
  '/': catalogPage,
  '/auth/login': loginPage,
  '/auth/register': registerPage,
  '/auth/forgot-password': forgotPasswordPage,
  '/account': accountPage,
  '/checkout': checkoutPage,
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) {
      const handler = api[`${req.method} ${pathname.slice(4)}`];
      if (!handler) return send(res, 404, 'application/json', JSON.stringify({ message: 'Not found' }));
      const body = req.method === 'POST' ? await readJson(req) : {};
      if (body === null) return send(res, 400, 'application/json', JSON.stringify({ message: 'Invalid JSON' }));
      const [status, data] = handler(body, req);
      return send(res, status, 'application/json', JSON.stringify(data));
    }
    if (req.method !== 'GET') return send(res, 405, 'text/plain', 'Method not allowed');
    const product = /^\/product\/(\w+)$/.exec(pathname);
    if (product) {
      const p = PRODUCTS.find((x) => x.id === product[1]);
      return p ? send(res, 200, 'text/html; charset=utf-8', productPage(p))
               : send(res, 404, 'text/html; charset=utf-8', layout('Not found', '<h1>Product not found</h1>'));
    }
    const page = pages[pathname.replace(/\/$/, '') || '/'];
    if (page) return send(res, 200, 'text/html; charset=utf-8', page());
    return send(res, 404, 'text/html; charset=utf-8', layout('Not found', '<h1>Page not found</h1>'));
  } catch (err) {
    console.error(err);
    return send(res, 500, 'text/plain', 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Toolshop (local) listening on http://localhost:${PORT}`);
});
