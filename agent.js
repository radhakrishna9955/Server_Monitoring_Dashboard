// This is the final agent.js with advanced warnings and user simulation
const si = require('systeminformation');

const TARGET_URL = 'https://api.publicapis.org/entries';
let checkHistory = [];
const HISTORY_LENGTH = 100;

// --- NEW: Simulate a list of logged-in authorities ---
const mockUsers = [
    { user: 'admin', ip: '192.168.1.10', time: new Date(Date.now() - 10 * 60000).toLocaleTimeString() },
    { user: 'dev_user', ip: '203.0.113.45', time: new Date(Date.now() - 35 * 60000).toLocaleTimeString() },
    { user: 'security_audit', ip: '198.51.100.2', time: new Date(Date.now() - 120 * 60000).toLocaleTimeString() },
];

async function sendMetrics() {
  try {
    // --- API Monitoring ---
    const startTime = Date.now();
    let responseTime = 0, isSuccess = false;
    try {
        const response = await fetch(TARGET_URL);
        responseTime = Date.now() - startTime;
        isSuccess = response.ok;
    } catch (e) { isSuccess = false; }
    checkHistory.unshift(isSuccess);
    if (checkHistory.length > HISTORY_LENGTH) checkHistory.pop();
    const successCount = checkHistory.filter(Boolean).length;
    const uptimePercentage = ((successCount / checkHistory.length) * 100).toFixed(1);

    // --- System Monitoring ---
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fs = (await si.fsSize())[0];
    const processes = await si.processes();
    const uptime = si.time();

    // --- NEW: Generate more specific server warnings ---
    const warnings = [];
    if (cpu.currentLoad > 80) warnings.push('High CPU Load Detected!');
    if ((mem.used / mem.total * 100) > 80) warnings.push('High Memory Usage!');
    if ((fs.used / fs.size * 100) > 90) warnings.push('Disk Space Critically Low!');
    if (processes.running > 200) warnings.push('Excessive Number of Processes Running!');


    const memUsedPercent = (mem.used / mem.total) * 100;
    const diskUsedPercent = (fs.used / fs.size) * 100;
    const d = Math.floor(uptime.uptime / (3600 * 24)), h = Math.floor(uptime.uptime % (3600 * 24) / 3600), m = Math.floor(uptime.uptime % 3600 / 60);
    const uptimeString = `${d}d ${h}h ${m}m`;

    const metrics = {
      cpu: cpu.currentLoad.toFixed(1),
      memory: memUsedPercent.toFixed(1),
      disk: diskUsedPercent.toFixed(1),
      uptime: uptimeString,
      responseTime: responseTime,
      uptimePercentage: uptimePercentage,
      lastCheck: new Date().toLocaleTimeString(),
      warnings: warnings, // Add warnings to the data
      users: mockUsers    // Add simulated users to the data
    };

    await fetch('http://localhost:3000/submit-metric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });

  } catch (e) {
    console.error("Agent error:", e.message);
  }
}

console.log(`Local monitoring agent started.`);
setInterval(sendMetrics, 5000);