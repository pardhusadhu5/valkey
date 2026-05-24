const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) reject(new Error(`Status ${res.statusCode}: ${data}`));
                else resolve(JSON.parse(data));
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) reject(new Error(`Status ${res.statusCode}: ${data}`));
                else resolve(JSON.parse(data));
            });
        }).on('error', reject);
    });
}

async function test() {
    console.log("1. Adding Sony WH-1000XM5 Headphones to cart (quantity 2)...");
    const addResult = await post('/api/cart/items', {
        userId: 'guest_user',
        productId: 'product:0192d4e6-4e6a-7b9d-8c1b-2b3c4d5e6f7a',
        quantity: 2
    });
    console.log("Success:", addResult);

    console.log("\n2. Getting cart state (before coupon)...");
    const cartBefore = await get('/api/cart?userId=guest_user');
    console.log("Cart Subtotal:", cartBefore.subtotal);
    console.log("Cart Discount:", cartBefore.discount);
    console.log("Cart Total:", cartBefore.total);

    console.log("\n3. Applying coupon VALKEY10...");
    const couponResult = await post('/api/cart/coupon', {
        userId: 'guest_user',
        couponCode: 'VALKEY10'
    });
    console.log("Success:", couponResult.message);

    console.log("\n4. Getting cart state (after coupon)...");
    const cartAfter = await get('/api/cart?userId=guest_user');
    console.log("Cart Subtotal:", cartAfter.subtotal);
    console.log("Cart Discount:", cartAfter.discount);
    console.log("Cart Tax (8%):", cartAfter.tax);
    console.log("Cart Total:", cartAfter.total);
    console.log("Coupon Message:", cartAfter.couponMessage);

    console.log("\n5. Testing trending view event tracking...");
    const eventResult = await post('/api/events/view', {
        productId: 'product:0192d4e6-4e6a-7b9d-8c1b-2b3c4d5e6f7a'
    });
    console.log("Success:", eventResult);

    console.log("\n6. Getting trending leaderboard...");
    const trending = await get('/api/trending');
    console.log("Trending Products:");
    trending.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} (ID: ${p.id})`);
    });

    console.log("\n🎉 All tests passed successfully!");
    process.exit(0);
}

test().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
