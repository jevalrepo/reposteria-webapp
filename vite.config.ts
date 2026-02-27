import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/reposteria-webapp/', // cambia si tu repo tiene otro nombre

  server: {
    port: 5177,       // Puerto fijo para desarrollo
    strictPort: true, // Si está ocupado, no cambia automáticamente
    host: true        // Permite acceso desde red local si lo necesitas
  },

  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})