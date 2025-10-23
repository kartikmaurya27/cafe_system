// --- 1. INITIAL DATA STRUCTURES & LOCAL STORAGE ---

const DEFAULT_MENU = [
    { id: 1, category: "Chai", item_name: "Masala Chai", price: 30, stock: 50 },
    { id: 2, category: "Chai", item_name: "Ginger Chai", price: 35, stock: 45 },
    { id: 3, category: "Snacks", item_name: "Samosa", price: 20, stock: 60 },
    { id: 4, category: "Drinks", item_name: "Lassi", price: 60, stock: 30 },
];

let menu = JSON.parse(localStorage.getItem('menu')) || DEFAULT_MENU;
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let customers = JSON.parse(localStorage.getItem('customers')) || [];
let revenue = JSON.parse(localStorage.getItem('revenue')) || [];
let currentCart = [];
let nextCustomerId = JSON.parse(localStorage.getItem('nextCustomerId')) || 1;
let nextOrderId = JSON.parse(localStorage.getItem('nextOrderId')) || 1;
let nextMenuItemId = menu.length > 0 ? Math.max(...menu.map(i => i.id)) + 1 : 1;


function updateLocalStorage() {
    localStorage.setItem('menu', JSON.stringify(menu));
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('revenue', JSON.stringify(revenue));
    localStorage.setItem('nextCustomerId', nextCustomerId);
    localStorage.setItem('nextOrderId', nextOrderId);
}

// --- 2. GLOBAL UTILITIES ---

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); // Adjust for Sunday/Monday start
    return d.toISOString().split('T')[0];
}

// --- 3. PAGE ROUTING & INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = e.target.getAttribute('data-page');
            switchPage(targetPage);
        });
    });

    // Initialize the starting page
    switchPage('menu');
});

function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-page') === pageId) {
            button.classList.add('active');
        }
    });

    // Run the specific renderer for the page
    if (pageId === 'menu') renderMenu();
    if (pageId === 'orders') renderOrders();
    if (pageId === 'stock') renderStock();
    if (pageId === 'revenue') renderRevenue('all'); // Default to all time
}

// --- 4. MENU/ORDERING LOGIC ---

function renderMenu() {
    const menuContainer = document.getElementById('menu-container');
    menuContainer.innerHTML = ''; 
    const categorizedMenu = menu.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
    }, {});

    for (const category in categorizedMenu) {
        let categoryHtml = `<h3>${category}</h3>`;
        categorizedMenu[category].forEach(item => {
            const isOutOfStock = item.stock <= 0;
            const stockText = isOutOfStock ? 
                `<span class="out-of-stock">Out of Stock</span>` : 
                `Avail: ${item.stock}`;

            categoryHtml += `
                <div class="menu-item">
                    <div class="item-info">
                        <strong>${item.item_name}</strong>
                        <span> (₹${item.price.toFixed(2)})</span>
                        <p style="margin: 0; font-size: 0.9em;">${stockText}</p>
                    </div>
                    <button class="add-button" data-id="${item.id}" ${isOutOfStock ? 'disabled' : ''}>
                        Add to Cart
                    </button>
                </div>
            `;
        });
        menuContainer.innerHTML += categoryHtml;
    }
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    let total = 0;
    
    cartItemsContainer.innerHTML = ''; 

    if (currentCart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Cart is empty.</p>';
        cartTotalSpan.textContent = '₹0.00';
        return;
    }

    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const cartItemHtml = `
            <p style="display: flex; justify-content: space-between;">
                <span>${index + 1}. ${item.name} x${item.qty}</span> 
                <strong>₹${itemTotal.toFixed(2)}</strong>
            </p>
        `;
        cartItemsContainer.innerHTML += cartItemHtml;
    });

    cartTotalSpan.textContent = `₹${total.toFixed(2)}`;
}

function addToCart(itemId) {
    const item = menu.find(i => i.id === itemId);

    if (!item || item.stock <= 0) {
        alert("Item is out of stock or not found.");
        return;
    }

    const existingCartItem = currentCart.find(i => i.id === itemId);

    if (existingCartItem) {
        if (existingCartItem.qty + 1 > item.stock) {
            alert(`Not enough stock. Available: ${item.stock}`);
            return;
        }
        existingCartItem.qty += 1; 
    } else {
        currentCart.push({
            id: item.id,
            name: item.item_name,
            price: item.price,
            qty: 1
        });
    }
    
    renderCart();
}

document.getElementById('menu-container').addEventListener('click', (event) => {
    if (event.target.classList.contains('add-button')) {
        const itemId = parseInt(event.target.getAttribute('data-id'));
        addToCart(itemId);
    }
});

document.getElementById('confirm-order-button').addEventListener('click', () => {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    
    if (!name || !phone) {
        alert("Name and Phone are required!");
        return;
    }
    if (currentCart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    // 1. Save Customer
    const customer = { id: nextCustomerId++, name, phone, email };
    customers.push(customer);
    
    // 2. Process Stock & Items Summary
    const itemsSummary = currentCart.map(cartItem => {
        const menuItem = menu.find(i => i.id === cartItem.id);
        
        // This is the core stock update (Transaction)
        if (menuItem) menuItem.stock -= cartItem.qty; 
        
        return `${cartItem.name} x${cartItem.qty}`;
    }).join(', ');
    
    const total = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // 3. Save Order
    const newOrder = {
        id: nextOrderId++,
        customer_id: customer.id,
        items: itemsSummary,
        status: "Pending",
        total: parseFloat(total.toFixed(2)),
        order_date: getTodayDate(),
        created_at: new Date().toISOString(),
    };
    orders.push(newOrder);

    // 4. Save Revenue
    revenue.push({
        order_id: newOrder.id,
        amount: newOrder.total,
        revenue_date: newOrder.order_date,
    });

    // 5. Cleanup
    currentCart = [];
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-email').value = '';

    updateLocalStorage();
    renderMenu(); 
    alert(`Order #${newOrder.id} confirmed! Total: ₹${newOrder.total.toFixed(2)}`);
});

// --- 5. ORDERS LOGIC ---

function renderOrders() {
    const container = document.getElementById('orders-table-container');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th><input type="checkbox" id="select-all-orders"></th>
                <th>ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Total ₹</th>
            </tr>
        </thead>
        <tbody id="orders-tbody"></tbody>
    `;
    container.appendChild(table);
    
    const tbody = document.getElementById('orders-tbody');
    orders.sort((a, b) => b.id - a.id).forEach(order => {
        const customer = customers.find(c => c.id === order.customer_id) || { name: 'N/A' };
        const row = document.createElement('tr');
        row.classList.add(`status-${order.status}`);
        row.innerHTML = `
            <td><input type="checkbox" class="order-select" data-id="${order.id}"></td>
            <td>${order.id}</td>
            <td>${order.order_date}</td>
            <td>${customer.name}</td>
            <td>${order.items}</td>
            <td>${order.status}</td>
            <td>₹${order.total.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

document.getElementById('mark-complete-button').addEventListener('click', () => {
    const selectedOrders = Array.from(document.querySelectorAll('.order-select:checked'))
        .map(cb => parseInt(cb.getAttribute('data-id')));
    
    if (selectedOrders.length === 0) {
        alert("Select at least one order to mark complete.");
        return;
    }
    
    selectedOrders.forEach(orderId => {
        const order = orders.find(o => o.id === orderId);
        if (order) order.status = 'Completed';
    });
    
    updateLocalStorage();
    renderOrders();
    alert(`${selectedOrders.length} order(s) marked Completed.`);
});

document.getElementById('generate-bill-button').addEventListener('click', () => {
    const selectedOrders = Array.from(document.querySelectorAll('.order-select:checked'))
        .map(cb => parseInt(cb.getAttribute('data-id')));
        
    if (selectedOrders.length !== 1) {
        alert("Select exactly one order to generate a bill.");
        return;
    }
    
    const order = orders.find(o => o.id === selectedOrders[0]);
    const customer = customers.find(c => c.id === order.customer_id);

    const billDetails = `
        --- CHAI KI CHUSKI BILL ---
        Order ID: ${order.id}
        Date: ${order.order_date}
        Status: ${order.status}
        ---------------------------
        Customer: ${customer.name}
        Phone: ${customer.phone || '-'}
        Email: ${customer.email || '-'}
        ---------------------------
        Items: ${order.items.replace(/, /g, '\n       ')}
        ---------------------------
        TOTAL: ₹${order.total.toFixed(2)}
    `;
    
    // Using a simple alert for bill generation, as a proper print function requires more libraries.
    alert(billDetails);
});

// --- 6. STOCK LOGIC ---

let selectedStockId = null;

function renderStock() {
    const container = document.getElementById('stock-table-container');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th><input type="radio" name="stock-select-radio" disabled></th>
                <th>ID</th>
                <th>Category</th>
                <th>Item</th>
                <th>Stock</th>
            </tr>
        </thead>
        <tbody id="stock-tbody"></tbody>
    `;
    container.appendChild(table);
    
    const tbody = document.getElementById('stock-tbody');
    menu.sort((a, b) => a.category.localeCompare(b.category)).forEach(item => {
        const stockDisplay = item.stock > 0 ? item.stock : `<span class="out-of-stock">Out of Stock</span>`;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="radio" name="stock-select-radio" class="stock-select" data-id="${item.id}" data-name="${item.item_name}" data-stock="${item.stock}"></td>
            <td>${item.id}</td>
            <td>${item.category}</td>
            <td>${item.item_name}</td>
            <td>${stockDisplay}</td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('.stock-select').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedStockId = parseInt(e.target.getAttribute('data-id'));
            }
        });
    });
}

// Stock Update Modal Handlers
document.getElementById('update-stock-button').addEventListener('click', () => {
    const radio = document.querySelector('.stock-select:checked');
    if (!radio) {
        alert("Select an item to update stock.");
        return;
    }
    
    const name = radio.getAttribute('data-name');
    document.getElementById('modal-stock-name').textContent = name;
    document.getElementById('modal-stock').style.display = 'block';
    document.getElementById('modal-stock-increase').value = '';
});

document.getElementById('modal-stock-save').addEventListener('click', () => {
    const increase = parseInt(document.getElementById('modal-stock-increase').value);
    
    if (isNaN(increase) || increase <= 0) {
        alert("Enter a valid quantity to add.");
        return;
    }
    
    const item = menu.find(i => i.id === selectedStockId);
    if (item) {
        item.stock += increase;
        updateLocalStorage();
        alert(`${item.item_name} stock updated to ${item.stock}.`);
        document.getElementById('modal-stock').style.display = 'none';
        renderStock();
    }
});

// Add Item Modal Handlers
document.getElementById('add-menu-item-button').addEventListener('click', () => {
    document.getElementById('modal-add-item').style.display = 'block';
});

document.getElementById('modal-add-item-save').addEventListener('click', () => {
    const name = document.getElementById('add-item-name').value.trim();
    const category = document.getElementById('add-item-category').value;
    const price = parseFloat(document.getElementById('add-item-price').value);
    const stock = parseInt(document.getElementById('add-item-stock').value);

    if (!name || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
        alert("Please enter valid values for all fields.");
        return;
    }
    
    const newItem = {
        id: nextMenuItemId++, 
        category,
        item_name: name,
        price,
        stock,
    };
    menu.push(newItem);
    
    updateLocalStorage();
    alert(`'${name}' added to menu.`);
    document.getElementById('modal-add-item').style.display = 'none';
    renderStock();
});

// Close Modals
document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});


// --- 7. REVENUE LOGIC ---

document.getElementById('revenue-filters').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('#revenue-filters button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderRevenue(e.target.getAttribute('data-period'));
    }
});

function renderRevenue(period) {
    const today = new Date();
    let startDate = null;
    let endDate = today;

    if (period === 'today') {
        startDate = today;
    } else if (period === 'yesterday') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = startDate;
    } else if (period === 'week') {
        startDate = new Date(getWeekStart(today));
    } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1);
    }
    
    // Filter revenue data based on dates
    const filteredRevenue = revenue.filter(r => {
        if (period === 'all') return true;
        
        const revDate = new Date(r.revenue_date);
        
        // Normalize comparison dates to midnight
        const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const rD = new Date(revDate.getFullYear(), revDate.getMonth(), revDate.getDate());

        return rD >= s && rD <= e;
    });

    // Group by Date
    const dailyRevenue = filteredRevenue.reduce((acc, item) => {
        acc[item.revenue_date] = acc[item.revenue_date] || { amount: 0, orders: 0 };
        acc[item.revenue_date].amount += item.amount;
        acc[item.revenue_date].orders += 1;
        return acc;
    }, {});
    
    const totalRevenue = filteredRevenue.reduce((sum, r) => sum + r.amount, 0);
    const totalOrders = filteredRevenue.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const statsHtml = `
        <h4>📊 ${period.charAt(0).toUpperCase() + period.slice(1)} Revenue</h4>
        <p style="font-size: 1.2em; font-weight: bold; color: #228B22;">Total Revenue: ₹${totalRevenue.toFixed(2)}</p>
        <p>Total Orders: ${totalOrders}</p>
        <p>Average per Order: ₹${avgOrder.toFixed(2)}</p>
    `;
    document.getElementById('revenue-stats').innerHTML = statsHtml;
    
    // Display daily breakdown table
    const container = document.getElementById('revenue-table-container');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Revenue (₹)</th>
            </tr>
        </thead>
        <tbody id="revenue-tbody"></tbody>
    `;
    container.appendChild(table);

    const tbody = document.getElementById('revenue-tbody');
    
    // Sort keys descending
    const sortedDates = Object.keys(dailyRevenue).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        const data = dailyRevenue[date];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${data.orders}</td>
            <td>₹${data.amount.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}