import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx';
import MyCourses from './MyCourses.jsx';

export default function App() {

  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/mycourses" element={<MyCourses />} />
        </Routes>
      </HashRouter>
    </div>
  );
}
