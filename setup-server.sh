#!/bin/bash

# Script alternativo usando PM2 para servir archivos estáticos
# Más flexible que Nginx para proyectos pequeños

echo "🚀 Configurando servidor con PM2 + serve..."

# Instalar serve (servidor estático simple)
npm install -g serve

# Crear archivo de configuración PM2
cat > /var/www/nexuxplanner/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nexuxplanner',
    script: 'serve',
    args: 'dist -l 3033 -s',
    cwd: '/var/www/nexuxplanner',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Iniciar aplicación con PM2
cd /var/www/nexuxplanner
pm2 start ecosystem.config.js
pm2 save

# Configurar PM2 para iniciar con el sistema
pm2 startup systemd

echo "✅ Aplicación corriendo en puerto 3033"
echo "Comandos útiles:"
echo "  pm2 status          - Ver estado"
echo "  pm2 logs nexuxplanner - Ver logs"
echo "  pm2 restart nexuxplanner - Reiniciar"