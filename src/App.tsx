import { Navigate, Route, Routes } from 'react-router-dom'
import CarritoPage from './pages/Carrito/CarritoPage'
import CategoriasPage from './pages/Categorias/CategoriasPage'
import MiCuentaPage from './pages/Cuenta/MiCuentaPage'
import InicioPage from './pages/Inicio/InicioPage'
import NavBar from './pages/Master/NavBar'
import ProductoDetallePage from './pages/Producto/ProductoDetallePage'

export default function App() {
  return (
    <div className="min-h-screen bg-rose-50/60 text-slate-900">
      <NavBar />
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/producto/:id" element={<ProductoDetallePage />} />
        <Route path="/carrito" element={<CarritoPage />} />
        <Route path="/mi-cuenta" element={<MiCuentaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
