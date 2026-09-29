const http = require('http');

const data = JSON.stringify({
    lrn: '12316546',
    name: 'Cebrero, John Laurence P.',
    custom_fields: {},
    section: null,
    adviser: 'Pending Assignment'
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/students',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': data.length
    }
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
