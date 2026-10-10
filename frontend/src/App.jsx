import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Plants from './pages/Plants';
import AddPlant from './pages/AddPlant';
import PlantDetails from './pages/PlantDetails';
import Diagnosis from './pages/Diagnosis';
import Watering from './pages/Watering';
import Care from './pages/Care';
import Weather from './pages/Weather';
import Activity from './pages/Activity';
import Recommendations from './pages/Recommendations';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="plants" element={<Plants />} />
          <Route path="plants/add" element={<AddPlant />} />
          <Route path="plants/:id" element={<PlantDetails />} />
          <Route path="diagnosis" element={<Diagnosis />} />
          <Route path="watering" element={<Watering />} />
          <Route path="care" element={<Care />} />
          <Route path="weather" element={<Weather />} />
          <Route path="activity" element={<Activity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
