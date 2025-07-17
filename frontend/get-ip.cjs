const os = require('os');
const fs = require('fs');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const envContent = `# Environment variables for LinkUp
# Auto-generated based on network IP: ${localIP}

VITE_API_URL=http://${localIP}:8001/api
VITE_SOCKET_URL=http://${localIP}:8001

# Fallback for localhost development
# VITE_API_URL=http://localhost:8001/api
# VITE_SOCKET_URL=http://localhost:8001
`;

fs.writeFileSync('.env', envContent);
console.log(`✅ Updated .env with IP: ${localIP}`);
console.log(`   API URL: http://${localIP}:8001/api`);
console.log(`   Socket URL: http://${localIP}:8001`);
