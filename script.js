/* ============================================================
   Online Book Store - JavaScript
   One script is shared by every frame and every page.  Each
   setup function first checks whether the elements it needs are
   present, so nothing runs on a page it does not belong to.
   ============================================================ */

var CART_KEY = "bookstore_cart";
var USER_KEY = "bookstore_user";
var REDIRECT_KEY = "bookstore_after_login";

/* Pages that are allowed to be opened inside the right frame. */
var CONTENT_PAGES = ["home.html", "login.html", "registration.html",
                     "catalogue.html", "cart.html"];

/* ---------- 0. Storage helpers (never let the page crash) ---------- */

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        /* storage blocked - the site still works, it just forgets */
    }
}

function storageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        /* ignore */
    }
}

/* ---------- 1. Small utilities ---------- */

function currentPage() {
    var path = window.location.pathname;
    var name = path.substring(path.lastIndexOf("/") + 1);
    if (name === "") {
        name = "index.html";
    }
    return name;
}

function queryValue(name) {
    var search = window.location.search;
    if (search.indexOf(name + "=") === -1) {
        return "";
    }
    var part = search.split(name + "=")[1].split("&")[0];
    return decodeURIComponent(part);
}

function money(value) {
    var rounded = Math.round(value * 100) / 100;
    return "$" + rounded;
}

/* ---------- 2. Keep the three frames together ----------
   If a content page is opened on its own (for example the browser
   remembered catalogue.html), send the visitor back to index.html
   and ask for that page to be loaded in the right frame.          */

function keepInsideFrames() {
    if (window.top !== window.self) {
        return;                       /* already inside a frame - fine */
    }

    var page = currentPage();
    var isContent = false;

    for (var i = 0; i < CONTENT_PAGES.length; i++) {
        if (CONTENT_PAGES[i] === page) {
            isContent = true;
        }
    }

    if (page === "top.html" || page === "left.html") {
        window.location.replace("index.html");
        return;
    }

    if (isContent) {
        var url = "index.html?page=" + page;
        var branch = queryValue("branch");
        if (branch !== "") {
            url = url + "&branch=" + encodeURIComponent(branch);
        }
        window.location.replace(url);
    }
}

/* ---------- 3. Cart storage ---------- */

function getCart() {
    var data = storageGet(CART_KEY);
    if (!data) {
        return [];
    }
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    storageSet(CART_KEY, JSON.stringify(cart));
}

function addToCart(book) {
    var cart = getCart();
    var found = false;

    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === book.id) {
            cart[i].qty = cart[i].qty + 1;
            found = true;
            break;
        }
    }

    if (!found) {
        book.qty = 1;
        cart.push(book);
    }

    saveCart(cart);
    updateCartCount();
}

function removeFromCart(id) {
    var cart = getCart();
    var newCart = [];

    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id !== id) {
            newCart.push(cart[i]);
        }
    }

    saveCart(newCart);
    updateCartCount();
    renderCart();
}

function changeQty(id, delta) {
    var cart = getCart();

    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            cart[i].qty = cart[i].qty + delta;
            if (cart[i].qty < 1) {
                cart[i].qty = 1;
            }
            break;
        }
    }

    saveCart(cart);
    updateCartCount();
    renderCart();
}

function getCartCount() {
    var cart = getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
        count = count + cart[i].qty;
    }
    return count;
}

/* ---------- 4. Login state ---------- */

function getUser() {
    return storageGet(USER_KEY);
}

function setUser(name) {
    storageSet(USER_KEY, name);
}

function logoutUser() {
    storageRemove(USER_KEY);
}

/* ---------- 5. Top frame: cart count and login / logout link ---------- */

function updateCartCount() {
    var link = document.getElementById("nav-cart");
    if (!link) {
        return;
    }

    var count = getCartCount();
    link.innerHTML = count > 0 ? "Cart (" + count + ")" : "Cart";
}

function updateAuthLink() {
    var link = document.getElementById("nav-login");
    if (!link) {
        return;
    }

    var user = getUser();

    if (user) {
        link.innerHTML = "Logout (" + user + ")";
        link.setAttribute("href", "#");
        link.removeAttribute("target");
    } else {
        link.innerHTML = "Login";
        link.setAttribute("href", "login.html");
        link.setAttribute("target", "rightFrame");
    }
}

function setupTopFrame() {
    var link = document.getElementById("nav-login");
    if (!link) {
        return;                       /* not the top frame */
    }

    link.onclick = function (event) {
        if (!getUser()) {
            return true;              /* normal "Login" link */
        }
        event.preventDefault();
        logoutUser();
        updateAuthLink();
        loadInRightFrame("home.html");
        return false;
    };

    updateCartCount();
    updateAuthLink();

    /* The cart is changed in the right frame, so the top frame watches
       the storage and refreshes itself. */
    window.onstorage = function () {
        updateCartCount();
        updateAuthLink();
    };

    setInterval(function () {
        updateCartCount();
        updateAuthLink();
    }, 1500);
}

/* Ask the right frame to open a page (used by the logout link). */
function loadInRightFrame(page) {
    try {
        if (window.parent && window.parent.frames["rightFrame"]) {
            window.parent.frames["rightFrame"].location.href = page;
        }
    } catch (e) {
        /* browsers can block frame access on file:// - ignore */
    }
}

/* ---------- 6. Left frame: highlight the branch that was clicked ---------- */

function setupLeftFrame() {
    var links = document.querySelectorAll(".branch-list a");
    if (links.length === 0) {
        return;
    }

    for (var i = 0; i < links.length; i++) {
        links[i].onclick = function () {
            for (var j = 0; j < links.length; j++) {
                links[j].className = "";
            }
            this.className = "active";
            return true;
        };
    }
}

/* ---------- 7. Catalogue page ---------- */

function setupCatalogue() {
    var rows = document.querySelectorAll(".book-row");
    if (rows.length === 0) {
        return;
    }

    /* 7a. show only the branch asked for by the left frame */
    var branch = queryValue("branch").toUpperCase();
    var blocks = document.querySelectorAll(".branch-block");
    var heading = document.getElementById("catalogue-heading");
    var hint = document.querySelector(".catalogue-hint");

    if (branch !== "") {
        var matched = false;

        for (var b = 0; b < blocks.length; b++) {
            if (blocks[b].getAttribute("data-branch") === branch) {
                blocks[b].style.display = "block";
                matched = true;
            } else {
                blocks[b].style.display = "none";
            }
        }

        if (matched) {
            heading.innerHTML = "Catalogue &ndash; " + branch + " Books";
            if (hint) {
                hint.innerHTML = "Showing the books prescribed for " + branch +
                                 ". Pick another branch from the left frame, " +
                                 'or open <a href="catalogue.html">All Books</a>.';
            }
        }
    }

    /* 7b. Add to Cart buttons */
    for (var i = 0; i < rows.length; i++) {
        (function (row) {
            var button = row.querySelector(".add-btn");
            if (!button) {
                return;
            }

            button.onclick = function () {
                var book = {
                    id: row.getAttribute("data-id"),
                    title: row.getAttribute("data-title"),
                    author: row.getAttribute("data-author"),
                    publisher: row.getAttribute("data-publisher"),
                    price: Number(row.getAttribute("data-price")),
                    image: row.getAttribute("data-image")
                };

                addToCart(book);

                var original = button.innerHTML;
                button.innerHTML = "Added ✓";
                button.disabled = true;
                setTimeout(function () {
                    button.innerHTML = original;
                    button.disabled = false;
                }, 900);
            };
        })(rows[i]);
    }
}

/* ---------- 8. Cart page ---------- */

function renderCart() {
    var container = document.getElementById("cart-content");
    if (!container) {
        return;
    }

    var cart = getCart();

    if (cart.length === 0) {
        container.innerHTML =
            '<p>Your cart is empty. ' +
            'Open the <a href="catalogue.html">Catalogue</a> and add a few books.</p>';
        return;
    }

    var total = 0;
    var html = "";

    html += '<table class="cart-table">';
    html += "<thead><tr>";
    html += "<th>Cover</th><th>Book</th><th>Publisher</th><th>Price</th>";
    html += "<th>Quantity</th><th>Amount</th><th></th>";
    html += "</tr></thead><tbody>";

    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var subtotal = item.price * item.qty;
        total = total + subtotal;

        html += "<tr>";
        html += '<td><img class="cart-cover" src="' + item.image +
                '" alt="' + item.title + ' cover"></td>';
        html += '<td class="cart-title">' + item.title +
                "<span>by " + item.author + "</span></td>";
        html += "<td>" + (item.publisher || "-") + "</td>";
        html += '<td class="price">' + money(item.price) + "</td>";
        html += '<td class="cart-qty">';
        html += '<button type="button" class="qty-btn" data-action="dec" data-id="' + item.id + '">-</button>';
        html += "<span>" + item.qty + "</span>";
        html += '<button type="button" class="qty-btn" data-action="inc" data-id="' + item.id + '">+</button>';
        html += "</td>";
        html += '<td class="price">' + money(subtotal) + "</td>";
        html += '<td><button type="button" class="remove-btn" data-id="' + item.id + '">Remove</button></td>';
        html += "</tr>";
    }

    html += "</tbody></table>";
    html += '<p class="cart-total">Total : ' + money(total) + "</p>";
    html += '<div class="cart-actions">';
    html += '<button type="button" id="checkout-btn">Proceed to Checkout</button>';
    html += "</div>";
    html += '<div id="cart-message"></div>';

    container.innerHTML = html;

    var qtyButtons = container.querySelectorAll(".qty-btn");
    for (var q = 0; q < qtyButtons.length; q++) {
        qtyButtons[q].onclick = function () {
            changeQty(this.getAttribute("data-id"),
                      this.getAttribute("data-action") === "inc" ? 1 : -1);
        };
    }

    var removeButtons = container.querySelectorAll(".remove-btn");
    for (var r = 0; r < removeButtons.length; r++) {
        removeButtons[r].onclick = function () {
            removeFromCart(this.getAttribute("data-id"));
        };
    }

    var checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.onclick = checkout;
    }
}

function checkout() {
    var messageBox = document.getElementById("cart-message");

    if (!getUser()) {
        storageSet(REDIRECT_KEY, "cart.html");

        if (messageBox) {
            messageBox.className = "form-message error";
            messageBox.innerHTML = "Please login or register before checking out. " +
                                   "Opening the login page&hellip;";
        }

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1200);
        return;
    }

    saveCart([]);
    updateCartCount();

    var container = document.getElementById("cart-content");
    container.innerHTML =
        '<div class="form-message success">Thank you, ' + getUser() +
        "! Your order has been placed successfully.</div>" +
        '<p><a href="catalogue.html">Continue shopping</a></p>';
}

/* ---------- 9. Registration page ---------- */

function fillDateOfBirth() {
    var day = document.getElementById("dob-day");
    var year = document.getElementById("dob-year");
    if (!day || !year) {
        return;
    }

    var i;
    for (i = 1; i <= 31; i++) {
        day.innerHTML = day.innerHTML + '<option value="' + i + '">' + i + "</option>";
    }
    for (i = 2010; i >= 1960; i--) {
        year.innerHTML = year.innerHTML + '<option value="' + i + '">' + i + "</option>";
    }
}

function setupRegistration() {
    var form = document.getElementById("registration-form");
    if (!form) {
        return;
    }

    fillDateOfBirth();

    form.onsubmit = function (event) {
        event.preventDefault();

        var name = document.getElementById("name").value;
        var password = document.getElementById("password").value;
        var email = document.getElementById("email").value;
        var phone = document.getElementById("phone").value;

        /* trim the spaces at both ends */
        name = name.replace(/^\s+|\s+$/g, "");
        email = email.replace(/^\s+|\s+$/g, "");
        phone = phone.replace(/^\s+|\s+$/g, "");

        var errors = [];

        /* (1) Name - alphabets only and at least 6 characters */
        if (!/^[A-Za-z ]+$/.test(name) || name.replace(/ /g, "").length < 6) {
            errors.push("Name should contain only alphabets and must be at least 6 characters long.");
        }

        /* (2) Password - at least 6 characters */
        if (password.length < 6) {
            errors.push("Password should not be less than 6 characters in length.");
        }

        /* (3) E-mail id - must follow name@domain.com */
        if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
            errors.push("E-mail id is not valid. It must follow the pattern name@domain.com");
        }

        /* (4) Phone Number - exactly 10 digits */
        if (!/^[0-9]{10}$/.test(phone)) {
            errors.push("Phone number should contain 10 digits only.");
        }

        var messageBox = document.getElementById("form-message");

        if (errors.length > 0) {
            messageBox.className = "form-message error";
            messageBox.innerHTML = "<ul><li>" + errors.join("</li><li>") + "</li></ul>";
            return false;
        }

        setUser(name);
        messageBox.className = "form-message success";
        messageBox.innerHTML = "Registration successful! Welcome, " + name + ".";
        form.reset();
        redirectAfterAuth();
        return false;
    };
}

/* ---------- 10. Login page ---------- */

function setupLogin() {
    var form = document.getElementById("login-form");
    if (!form) {
        return;
    }

    form.onsubmit = function (event) {
        event.preventDefault();

        var username = document.getElementById("username").value.replace(/^\s+|\s+$/g, "");
        var password = document.getElementById("password").value;
        var messageBox = document.getElementById("form-message");

        if (username === "" || password === "") {
            messageBox.className = "form-message error";
            messageBox.innerHTML = "Please enter both the user name and the password.";
            return false;
        }

        if (password.length < 6) {
            messageBox.className = "form-message error";
            messageBox.innerHTML = "Password should not be less than 6 characters in length.";
            return false;
        }

        setUser(username);
        messageBox.className = "form-message success";
        messageBox.innerHTML = "Welcome, " + username + "! You are now logged in.";
        redirectAfterAuth();
        return false;
    };
}

/* After a successful login / registration go back to the cart if that is
   where the visitor came from, otherwise show the home page. */
function redirectAfterAuth() {
    var target = storageGet(REDIRECT_KEY);

    if (target) {
        storageRemove(REDIRECT_KEY);
        setTimeout(function () {
            window.location.href = target;
        }, 1000);
    }
}

/* ---------- 11. Run everything ---------- */

keepInsideFrames();

window.onload = function () {
    setupTopFrame();
    setupLeftFrame();
    setupCatalogue();
    renderCart();
    setupRegistration();
    setupLogin();
};
