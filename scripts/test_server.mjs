async function testServer() {
  try {
    const res = await fetch('http://localhost:3000');
    console.log('Dev server status:', res.status);
  } catch (err) {
    console.log('Dev server error:', err.message);
  }
}

testServer();
