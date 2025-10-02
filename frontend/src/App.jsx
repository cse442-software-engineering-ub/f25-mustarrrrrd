import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx';
import MyCourses from './MyCourses.jsx';

export default function App() {

  return (
    <div className="App">
      <BrowserRouter basename="/f25-mustarrrrrd/app">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/mycourses" element={<MyCourses />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
