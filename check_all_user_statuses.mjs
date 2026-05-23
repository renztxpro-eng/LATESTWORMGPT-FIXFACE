async function run() {
  console.log('--- Probing real user statuses ---');
  for (let id = 1; id <= 15; id++) {
    try {
      const res = await fetch('https://my-angge.x10.mx/api/sync.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_status',
          user_id: id,
          token: '' // maybe empty token works for status query if token verification is relaxed for get_user_status, or let's see if we get success
        })
      });
      const data = await res.json();
      if (data.success) {
        console.log(`User ID ${id}:`, {
          vip_status: data.vip_status,
          username: data.username,
          keys: Object.keys(data),
          payment_status: data.payment_status,
          payment_rejected: data.payment_rejected,
          status: data.status,
          payment: data.payment
        });
      } else {
        console.log(`User ID ${id} failed:`, data.message);
      }
    } catch(e) {
      console.log(`User ID ${id} error:`, e.message);
    }
  }
}
run();
