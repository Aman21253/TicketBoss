const http = require('http');

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }));
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting Verification ---');

    // 1. Get Summary (Initial)
    console.log('1. Checking Initial Summary...');
    let summary = await request('GET', '/reservations');
    console.log('Summary:', summary.body);
    if (summary.body.availableSeats !== 500) throw new Error('Initial seats wrong');

    // 2. Reserve 3 seats
    console.log('2. Reserving 3 seats...');
    let res1 = await request('POST', '/reservations', { partnerId: 'A', seats: 3 });
    console.log('Res 1:', res1.status, res1.body);
    if (res1.status !== 201) throw new Error('Failed to reserve');
    const resId = res1.body.reservationId;

    // 3. Check Summary
    summary = await request('GET', '/reservations');
    console.log('Summary after reservation:', summary.body);
    if (summary.body.availableSeats !== 497) throw new Error('Seats not deducted');

    // 4. Cancel Reservation
    console.log('4. Cancelling reservation...');
    let del = await request('DELETE', `/reservations/${resId}`);
    console.log('Delete:', del.status);
    if (del.status !== 204) throw new Error('Failed to cancel');

    // 5. Check Summary (Back to 500)
    summary = await request('GET', '/reservations');
    console.log('Summary after cancel:', summary.body);
    if (summary.body.availableSeats !== 500) throw new Error('Seats not returned');

    // 6. Concurrency Test
    console.log('6. Concurrency Test (5 requests for 100 seats each simultaneously)...');
    // 500 seats logic.
    // We'll try to book 150 seats x 4 requests = 600 seats. 
    // Should accept 3, reject 1 (or partials if logic allowed, but we require atomic all-or-nothing per request)

    // Actually let's try to update THE SAME version if we can force it, but HTTP hides version.
    // We rely on the server handling race conditions.
    // Let's send 20 requests for 30 seats. 20 * 30 = 600.
    // Should stop at 500 used.

    const promises = [];
    for (let i = 0; i < 60; i++) {
        promises.push(request('POST', '/reservations', { partnerId: `partner-${i}`, seats: 10 }));
    }

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    console.log(`Results: ${successes} Successes, ${conflicts} Conflicts, ${results.length - successes - conflicts} Others`);

    summary = await request('GET', '/reservations');
    console.log('Final Summary:', summary.body);

    // 500 / 30 = 16.66. Use 16 requests * 30 = 480 seats.
    // So we expect 16 successes, 4 conflicts.
    // OR if race conditions happen and 409s occur due to retries (if we had retries) or just failures.
    // Since we have NO retries, strict OCC, if two requests read same version, one writes, other fails.
    // So we might get FEWER than 16 successes if collisions occur high enough.
    // But correctness means: availableSeats + reservationCount * seats == 500 (roughly).
    // Strictly: Final Available + Sum(Accepted Seats) = 500.

    const totalBooked = successes * 10;
    if (summary.body.availableSeats + totalBooked !== 500) {
        console.error('MISMATCH! Leaked seats?');
    } else {
        console.log('Integrity Check Passed!');
    }
}

runTests().catch(console.error);
