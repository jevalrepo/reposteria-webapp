// App.tsx
import { useNavigate } from 'react-router-dom'
import NavBar from './pages/Master/NavBar'
import FrontImage from './pages/Home/FrontImage'

export default function App() {
  const navigate = useNavigate()

  return (
    <>
      <NavBar />

      <main>
        <FrontImage
          imageUrl="https://wallpapercave.com/wp/wp2698888.jpg"
          title="New arrivals are here"
          subtitle="Texto descriptivo…"
          ctaText="Shop New Arrivals"
          onCtaClick={() => navigate('/catalog')}
        />
      </main>
    </>
  )
}
