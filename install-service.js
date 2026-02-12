// Install as Windows Service
const Service = require('node-windows').Service;

const svc = new Service({
    name: 'FS Monitoring UAT',
    description: 'FS Monitoring UAT Application',
    script: 'F:\\MonitoringSheets\\app.js',
    workingDirectory: 'F:\\MonitoringSheets',
    env: [{
        name: "NODE_ENV",
        value: "production"
    }]
});

svc.on('install', () => {
    console.log('Service installed! Starting...');
    svc.start();
});

svc.on('error', (err) => {
    console.error('Error:', err);
});

svc.install();
