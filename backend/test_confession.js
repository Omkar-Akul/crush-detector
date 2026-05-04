async function test() {
    let res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test_confession@example.com', password: 'password123', name: 'Test User' })
    });
    
    let data = await res.json();
    console.log("Register:", data);
    
    if (!data.success) {
        res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test_confession@example.com', password: 'password123' })
        });
        data = await res.json();
        console.log("Login:", data);
    }

    const token = data.token;
    console.log("Token:", token);

    res = await fetch('http://localhost:5000/api/confessions', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'test', content: 'test content' })
    });

    data = await res.json();
    console.log("Confession response:", data);
}

test();
