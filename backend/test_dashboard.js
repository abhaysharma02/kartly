const axios = require('axios');

async function test() {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'test@example.com', password: 'password123' });
        const token = login.data.token;
        console.log('Login success');

        try { await axios.get('http://localhost:5000/api/vendor/categories', { headers: { Authorization: `Bearer ${token}` } }); console.log('categories ok'); } catch (e) { console.log('categories fail:', e.response?.data); }
        try { await axios.get('http://localhost:5000/api/vendor/menu-items', { headers: { Authorization: `Bearer ${token}` } }); console.log('menu-items ok'); } catch (e) { console.log('items fail:', e.response?.data); }
        try { await axios.get('http://localhost:5000/api/vendor/customers', { headers: { Authorization: `Bearer ${token}` } }); console.log('customers ok'); } catch (e) { console.log('customers fail:', e.response?.data); }
        try { await axios.get('http://localhost:5000/api/vendor/subscription', { headers: { Authorization: `Bearer ${token}` } }); console.log('subscription ok'); } catch (e) { console.log('sub fail:', e.response?.data); }
        try { await axios.get('http://localhost:5000/api/vendor/inventory', { headers: { Authorization: `Bearer ${token}` } }); console.log('inventory ok'); } catch (e) { console.log('inv fail:', e.response?.data); }
        try { await axios.get('http://localhost:5000/api/vendor/orders', { headers: { Authorization: `Bearer ${token}` } }); console.log('orders ok'); } catch (e) { console.log('orders fail:', e.message, e.response?.data); }

    } catch (e) {
        console.error('Login Error:', e.response ? e.response.data : e.message);
    }
}
test();
